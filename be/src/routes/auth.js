const express = require('express');
const https = require('https');
const bcrypt = require('bcrypt');
const { db, FieldValue } = require('../config/firebase');
const { AUTH_EXPIRATION } = process.env;
const { signToken, verifyToken } = require('../utils/jwt');

const GOOGLE_USERINFO_API = 'https://www.googleapis.com/oauth2/v3/userinfo';
const router = express.Router();

function httpGetJson(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers }, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                try {
                    const json = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
    });
}

function normalizeBackendUser(info) {
    return {
        username: info.username,
        email: info.email,
        phone: info.phone,
        avatar: info.avatar || null,
        createdAt: info.createdAt,
        updatedAt: info.updatedAt,
        provider: "email",
    };
}

function formatGoogleAvatar(rawPic) {
    if (!rawPic) return null;
    return rawPic.startsWith('http')
        ? rawPic
        : `https://lh3.googleusercontent.com/a/${rawPic}`;
}

function normalizeGoogleUser(info) {
    return {
        id: info?.id || null,
        username: info?.username || null,
        email: info?.email || null,
        phone: info?.phone || null,
        avatar: info?.avatar || null,
        googleSub: info?.googleSub || null,
        createdAt: info?.createdAt || null,
        updatedAt: info?.updatedAt || null,
        provider: "google",
    };
}

function getCookieExpires() {
    const sec = Number(AUTH_EXPIRATION);
    const ms = Number.isFinite(sec) && sec > 0 ? sec * 1000 : 3600 * 1000; // default 1h
    return ms;
}
const cookieExpires = getCookieExpires();

function cookieOptions() {
    const prod = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        sameSite: prod ? 'strict' : 'lax',
        secure: prod,                 // true on HTTPS in prod
        maxAge: cookieExpires,
        path: '/',
    };
}

async function findUserByEmail(email) {
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}

async function findUserByPhone(phone) {
    const snap = await db.collection('users').where('phone', '==', phone).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}

async function getUserById(id) {
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^[1-9]\d{0,3}-\d{6,14}$/;

router.post('/register', async (req, res) => {
    try {
        const { username, email, phone, password } = req.body || {};

        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedPhone = String(phone).trim();

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Please enter all required credentials!' });
        }
        if (!emailRe.test(normalizedEmail)) {
            return res.status(400).json({ message: "Invalid email format!" });
        }
        if (normalizedPhone && !phoneRe.test(normalizedPhone)) {
            return res.status(400).json({ message: "Invalid phone number format!" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters!' });
        }

        const existingEmail = await findUserByEmail(normalizedEmail);

        let existingPhone = null;
        if (normalizedPhone) {
            existingPhone = await findUserByPhone(normalizedPhone);
        }

        if (existingEmail) {
            return res.status(409).json({ message: "Email is already registered!" });
        }
        if (existingPhone) {
            return res.status(409).json({ message: "Phone number is already registered!" });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const now = FieldValue.serverTimestamp();

        const ref = db.collection('users').doc();
        const payload = {
            username: username,
            email: normalizedEmail,
            phone: normalizedPhone || '',
            passwordHash,
            avatar: '',
            createdAt: now,
            updatedAt: now,
        };
        await ref.set(payload);
        let user = { id: ref.id, ...payload };

        const token = signToken({ uid: ref.id, email: normalizedEmail });
        res.cookie('token', token, cookieOptions());

        return res.status(201).json({
            user: user,
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
        if (!user) return res.status(400).json({ message: 'No accounts with this email exist!' });

        const ok = await bcrypt.compare(password || '', user.passwordHash || '');
        if (!ok) return res.status(400).json({ message: 'Invalid credentials!' });

        const token = signToken({ uid: user.id, email: normalizedEmail });
        res.cookie('token', token, { ...cookieOptions(), maxAge: cookieExpires });

        return res.json({
            user: normalizeBackendUser(user),
            session: {
                type: "cookie",
                expiresAt: Date.now() + cookieExpires,
            }
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.post('/google', async (req, res) => {
    try {
        const { accessToken } = req.body || {};
        if (!accessToken) {
            return res.status(400).json({ message: 'Missing Google accessToken' });
        }

        // Fetch profile from Google using https.get
        const { status, data: info } = await httpGetJson(
            GOOGLE_USERINFO_API,
            { Authorization: `Bearer ${accessToken}` }
        );

        if (status !== 200) {
            return res.status(401).json({ message: 'Invalid Google accessToken' });
        }

        if (!info.email) {
            return res.status(400).json({ message: 'Google did not return an email' });
        }

        // First-time vs returning user
        let user = await findUserByEmail(info.email);

        if (!user) {
            const ref = db.collection('users').doc();
            const payload = {
                username: info.name,
                email: info.email,
                phone: "",
                avatar: formatGoogleAvatar(info.picture),
                googleSub: info.sub,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            };
            await ref.set(payload);
            user = { id: ref.id, ...payload };
        } else {
            const update = {
                updatedAt: FieldValue.serverTimestamp()
            };
            if (!user.googleSub && info.sub) update.googleSub = info.sub;
            let avatar = formatGoogleAvatar(info.picture);
            if (!user.avatar && avatar) update.avatar = avatar;

            if (Object.keys(update).length > 1) {
                await db.collection('users').doc(user.id).update(update);
                user = { ...user, ...update };
            }
        }

        // Issue session cookie like /login
        const token = signToken({ uid: user.id, email: user.email });
        res.cookie('token', token, { ...cookieOptions(), maxAge: cookieExpires });

        return res.json({
            user: normalizeGoogleUser(user),
            session: {
                type: 'cookie',
                expiresAt: Date.now() + cookieExpires,
            },
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.get('/me', async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        const decoded = verifyToken(token);

        const me = await getUserById(decoded.uid);
        if (!me) return res.status(404).json({ message: 'User not found' });

        return res.json({
            user: {
                id: me.id,
                username: me.username,
                email: me.email,
                phone: me.phone,
                avatar: me.avatar || '',
                createdAt: me.createdAt || '',
                updatedAt: me.updatedAt || '',
            }
        });
    } catch {
        return res.status(401).json({ message: 'Unauthorized' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token', { ...cookieOptions(), maxAge: 0 });
    return res.json({ loggedOut: true });
});

module.exports = router;
