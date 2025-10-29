const express = require('express');
const bcrypt = require('bcrypt');
const { db, FieldValue } = require('../config/firebase');
const { signToken } = require('../utils/jwt');

const router = express.Router();

function cookieOptions() {
    const prod = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        sameSite: prod ? 'strict' : 'lax',
        secure: prod,                 // true on HTTPS in prod
        maxAge: 60 * 60 * 1000,       // 1 hour
        path: '/',
    };
}

async function findUserByEmail(email) {
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}

async function getUserById(id) {
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

router.post('/register', async (req, res) => {
    try {
        const { email, password, username = '' } = req.body || {};
        if (!email || !password) return res.status(400).json({ message: 'Email & password are required' });
        if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 chars' });

        const normalizedEmail = String(email).trim().toLowerCase();
        const exists = await findUserByEmail(normalizedEmail);
        if (exists) return res.status(409).json({ message: 'Email already in use' });

        const passwordHash = await bcrypt.hash(password, 10);
        const now = FieldValue.serverTimestamp();

        const ref = db.collection('users').doc(); // auto id
        await ref.set({
            email: normalizedEmail,
            username,
            passwordHash,
            provider: 'local',
            createdAt: now,
            updatedAt: now,
        });

        const token = signToken({ uid: ref.id, email: normalizedEmail });
        res.cookie('token', token, cookieOptions());

        return res.status(201).json({
            user: { id: ref.id, email: normalizedEmail, username },
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        const normalizedEmail = String(email || '').trim().toLowerCase();

        const user = await findUserByEmail(normalizedEmail);
        if (!user) return res.status(400).json({ message: 'No accounts with this email exist' });

        const ok = await bcrypt.compare(password || '', user.passwordHash || '');
        if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

        const token = signToken({ uid: user.id, email: normalizedEmail });
        res.cookie('token', token, cookieOptions());

        return res.json({ user: { id: user.id, email: user.email, username: user.username || '' } });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.get('/me', async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        const { verifyToken } = require('../utils/jwt');
        const decoded = verifyToken(token);

        const me = await getUserById(decoded.uid);
        if (!me) return res.status(404).json({ message: 'User not found' });

        return res.json({
            user: {
                id: me.id,
                email: me.email,
                displayName: me.displayName || '',
                avatarUrl: me.avatarUrl || ''
            }
        });
    } catch {
        return res.status(401).json({ message: 'Unauthorized' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token', { ...cookieOptions(), maxAge: 0 });
    return res.json({ ok: true });
});

module.exports = router;
