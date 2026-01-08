const bcrypt = require("bcrypt");
const { db } = require("../config/firebase");
const { signToken } = require("../utils/jwt");
const { cookieExpires } = require("../utils/cookie");
const { getAuthUserFromRequest } = require("../utils/authUser");

function throwHttp(statusCode, message) {
    const err = new Error(message);
    err.statusCode = statusCode;
    throw err;
}

function buildSessionPayload(userId, email) {
    const accessToken = signToken({ uid: userId, email });
    return {
        type: "cookie+bearer",
        tokenType: "Bearer",
        accessToken,
        expiresAt: Date.now() + cookieExpires,
    };
}

function normalizeAdmin(userDoc) {
    return {
        id: userDoc.id,
        username: userDoc.username || "",
        email: userDoc.email || "",
        role: userDoc.role || "admin",
    };
}

async function findUserByEmail(email) {
    const snap = await db.collection("users").where("email", "==", email).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}

async function loginAdmin({ email, password }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail || !password) throwHttp(400, "Please enter email and password!");

    const user = await findUserByEmail(normalizedEmail);
    if (!user) throwHttp(400, "No accounts with this email exist!");

    if (user.role !== "admin") throwHttp(403, "Forbidden (admin only)");

    const ok = await bcrypt.compare(String(password || ""), user.passwordHash || "");
    if (!ok) throwHttp(400, "Invalid credentials!");

    const token = signToken({ uid: user.id, email: normalizedEmail });

    return {
        admin: normalizeAdmin(user),
        token,
        session: buildSessionPayload(user.id, normalizedEmail),
    };
}

async function requireAdmin(req) {
    const me = await getAuthUserFromRequest(req, { cookieName: "admin_token" });
    
    if (!me) throwHttp(401, "Unauthorized");
    if (me.role !== "admin") throwHttp(403, "Forbidden (admin only)");
    return normalizeAdmin(me);
}

async function getAdminMe(req) {
    try {
        return await requireAdmin(req);
    } catch {
        return null;
    }
}

module.exports = {
    loginAdmin,
    requireAdmin,
    getAdminMe,
};
