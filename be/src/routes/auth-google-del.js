const express = require('express');
const fetch = require('node-fetch'); // Node18 has global fetch, but this keeps it explicit
const { getOAuthClient } = require('../config/google-del');
const { db, FieldValue } = require('../config/firebase');
const { signToken } = require('../utils/jwt');

const router = express.Router();

function cookieOptions() {
    const prod = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        sameSite: prod ? 'strict' : 'lax',
        secure: prod,
        maxAge: 60 * 60 * 1000, // 1h; match your JWT_EXPIRES_IN if set to 1h
        path: '/',
    };
}

async function findUserByEmail(email) {
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}

router.get('/start', async (req, res) => {
    const client = getOAuthClient();
    const redirect = req.query.redirect || process.env.CLIENT_ORIGIN || 'http://localhost:5173';

    const url = client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['openid', 'email', 'profile'],
        state: encodeURIComponent(redirect),
    });

    return res.redirect(url);
});

router.get('/callback', async (req, res) => {
    try {
        const client = getOAuthClient();
        const { code, state } = req.query;
        const redirect = state ? decodeURIComponent(state) : (process.env.CLIENT_ORIGIN || 'http://localhost:5173');

        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        // Get profile
        const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const profile = await r.json(); // { email, name, picture, id, ... }

        if (!profile?.email) return res.status(400).send('Google profile missing email');

        const normalizedEmail = String(profile.email).trim().toLowerCase();

        // Upsert user
        let user = await findUserByEmail(normalizedEmail);
        const now = FieldValue.serverTimestamp();

        if (!user) {
            const ref = db.collection('users').doc();
            const u = {
                email: normalizedEmail,
                displayName: profile.name || '',
                avatarUrl: profile.picture || '',
                providers: ['google'],
                createdAt: now,
                updatedAt: now,
            };
            await ref.set(u);
            user = { id: ref.id, ...u };
        } else {
            const providers = user.providers || (user.provider ? [user.provider] : []);
            if (!providers.includes('google') || user.displayName !== profile.name || user.avatarUrl !== profile.picture) {
                await db.collection('users').doc(user.id).set({
                    providers: Array.from(new Set([...providers, 'google'])),
                    displayName: profile.name || user.displayName || '',
                    avatarUrl: profile.picture || user.avatarUrl || '',
                    updatedAt: now,
                }, { merge: true });

                user = {
                    ...user,
                    displayName: profile.name || user.displayName || '',
                    avatarUrl: profile.picture || user.avatarUrl || '',
                    providers: Array.from(new Set([...providers, 'google'])),
                };
            }
        }

        // Sign cookie
        const token = signToken({ uid: user.id, email: normalizedEmail });
        res.cookie('token', token, cookieOptions());

        // Redirect back to the FE
        return res.redirect(redirect);
    } catch (e) {
        console.error('Google callback error', e);
        return res.status(500).send('Google auth failed');
    }
});

module.exports = router;
