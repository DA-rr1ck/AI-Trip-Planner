const express = require('express');
const bcrypt = require('bcrypt');
const { db, FieldValue } = require('../config/firebase');
const { getAuthUserFromRequest, getUserById } = require('../utils/authUser');

const router = express.Router();

async function findUserByPhone(phone) {
    const snap = await db.collection('users').where('phone', '==', phone).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}

const phoneRe = /^[1-9]\d{0,3}-\d{6,14}$/;

router.patch('/update/username', async (req, res) => {
    try {
        const me = await getAuthUserFromRequest(req);
        if (!me) return res.status(401).json({ message: 'Unauthorized' });

        const { newUsername } = req.body || {};

        // Update phone in Firestore
        await db.collection('users').doc(me.id).update({
            username: newUsername,
            updatedAt: FieldValue.serverTimestamp(),
        });

        const updated = await getUserById(me.id);

        // Return updated user
        return res.json({
            user: {
                id: updated.id,
                username: updated.username,
                email: updated.email,
                phone: updated.phone,
                avatar: updated.avatar || '',
                createdAt: updated.createdAt || '',
                updatedAt: updated.updatedAt || '',
            }
        });
    } catch (e) {
        console.error('Error updating username:', e);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.patch('/update/phone', async (req, res) => {
    try {
        const me = await getAuthUserFromRequest(req);
        if (!me) return res.status(401).json({ message: 'Unauthorized' });

        const { newPhone } = req.body || {};
        const normalizedPhone = String(newPhone || '').trim();

        if (!normalizedPhone) {
            return res.status(400).json({ message: 'Please enter a phone number!' });
        }
        if (!phoneRe.test(normalizedPhone)) {
            return res.status(400).json({ message: 'Invalid phone number format!' });
        }

        // Check for duplicate phone (other account)
        const existing = await findUserByPhone(normalizedPhone);
        if (existing && existing.id !== me.id) {
            return res.status(409).json({ message: 'Phone number is already registered!' });
        }

        // Update phone in Firestore
        await db.collection('users').doc(me.id).update({
            phone: normalizedPhone,
            updatedAt: FieldValue.serverTimestamp(),
        });

        const updated = await getUserById(me.id);

        // Return updated user
        return res.json({
            user: {
                id: updated.id,
                username: updated.username,
                email: updated.email,
                phone: updated.phone,
                avatar: updated.avatar || '',
                createdAt: updated.createdAt || '',
                updatedAt: updated.updatedAt || '',
            }
        });
    } catch (e) {
        console.error('Error updating phone:', e);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.patch('/update/password', async (req, res) => {
    try {
        const me = await getAuthUserFromRequest(req);
        if (!me) return res.status(401).json({ message: 'Unauthorized' });

        const { currentPassword, newPassword } = req.body || {};

        // Check old password
        const ok = await bcrypt.compare(currentPassword || '', me.passwordHash || '');
        if (!ok) return res.status(400).json({ message: 'Invalid current password!' });

        const newHash = await bcrypt.hash(newPassword, 10);

        // Update password in Firestore
        await db.collection('users').doc(me.id).update({
            passwordHash: newHash,
            updatedAt: FieldValue.serverTimestamp(),
        });

        const updated = await getUserById(me.id);

        // Return updated user
        return res.json({
            user: {
                id: updated.id,
                username: updated.username,
                email: updated.email,
                phone: updated.phone,
                avatar: updated.avatar || '',
                createdAt: updated.createdAt || '',
                updatedAt: updated.updatedAt || '',
            }
        });
    } catch (e) {
        console.error('Error updating password:', e);
        return res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
