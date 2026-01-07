const https = require("https");
const bcrypt = require("bcrypt");
const { db, FieldValue } = require("../config/firebase");
const { signToken } = require("../utils/jwt");
const { getAuthUserFromRequest } = require("../utils/authUser");
const { cookieExpires } = require("../utils/cookie");

const GOOGLE_USERINFO_API = "https://www.googleapis.com/oauth2/v3/userinfo";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^[1-9]\d{0,3}-\d{6,14}$/;

/** Helpers */
function httpGetJson(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers }, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
                try {
                    const json = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on("error", reject);
    });
}

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

function normalizeBackendUser(info) {
    return {
        id: info.id,
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
    return rawPic.startsWith("http") ? rawPic : `https://lh3.googleusercontent.com/a/${rawPic}`;
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

/** Firebase access */
async function findUserByEmail(email) {
    const snap = await db.collection("users").where("email", "==", email).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}

async function findUserByPhone(phone) {
    const snap = await db.collection("users").where("phone", "==", phone).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}

async function checkRegister({ normalizedEmail, normalizedPhone }) {
    const existingEmail = await findUserByEmail(normalizedEmail);
    if (existingEmail) throwHttp(409, "Email is already registered!");

    if (normalizedPhone) {
        const existingPhone = await findUserByPhone(normalizedPhone);
        if (existingPhone) throwHttp(409, "Phone number is already registered!");
    }

    return true;
}

async function checkLogin({ normalizedEmail }) {
    const user = await findUserByEmail(normalizedEmail);
    if (!user) throwHttp(400, "No accounts with this email exist!");
    return user;
}

/** Main services */
async function register({ username, email, phone, password }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = String(phone || "").trim();

    // basic validation (no firebase here)
    if (!username || !email || !password) throwHttp(400, "Please enter all required credentials!");
    if (!emailRe.test(normalizedEmail)) throwHttp(400, "Invalid email format!");
    if (normalizedPhone && !phoneRe.test(normalizedPhone)) throwHttp(400, "Invalid phone number format!");
    if (String(password).length < 6) throwHttp(400, "Password must be at least 6 characters!");

    // checkRegister() -> firebase queries (email/phone duplicate check)
    await checkRegister({ normalizedEmail, normalizedPhone });

    // create user
    const passwordHash = await bcrypt.hash(String(password), 10);
    const now = FieldValue.serverTimestamp();

    const ref = db.collection("users").doc();
    const payload = {
        username,
        email: normalizedEmail,
        phone: normalizedPhone || "",
        passwordHash,
        avatar: "",
        createdAt: now,
        updatedAt: now,
    };

    await ref.set(payload);

    const user = { id: ref.id, ...payload };
    const token = signToken({ uid: ref.id, email: normalizedEmail });

    return {
        user: normalizeBackendUser(user),
        token,
        session: buildSessionPayload(ref.id, normalizedEmail),
    };
}

async function login({ email, password }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    // checkLogin() -> firebase query (find user by email)
    const user = await checkLogin({ normalizedEmail });

    // verify password
    const ok = await bcrypt.compare(String(password || ""), user.passwordHash || "");
    if (!ok) throwHttp(400, "Invalid credentials!");

    const token = signToken({ uid: user.id, email: normalizedEmail });

    return {
        user: normalizeBackendUser(user),
        token,
        session: buildSessionPayload(user.id, normalizedEmail),
    };
}

async function googleLogin({ accessToken }) {
    if (!accessToken) throwHttp(400, "Missing Google accessToken");

    const { status, data: info } = await httpGetJson(GOOGLE_USERINFO_API, {
        Authorization: `Bearer ${accessToken}`,
    });

    if (status !== 200) throwHttp(401, "Invalid Google accessToken");
    if (!info.email) throwHttp(400, "Google did not return an email");

    let user = await findUserByEmail(info.email);

    if (!user) {
        const ref = db.collection("users").doc();
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
        const update = { updatedAt: FieldValue.serverTimestamp() };
        if (!user.googleSub && info.sub) update.googleSub = info.sub;

        const avatar = formatGoogleAvatar(info.picture);
        if (!user.avatar && avatar) update.avatar = avatar;

        if (Object.keys(update).length > 1) {
            await db.collection("users").doc(user.id).update(update);
            user = { ...user, ...update };
        }
    }

    const token = signToken({ uid: user.id, email: user.email });

    return {
        user: normalizeGoogleUser(user),
        token,
        session: buildSessionPayload(user.id, user.email),
    };
}

async function getMe(req) {
    const me = await getAuthUserFromRequest(req);
    if (!me) return null;

    return {
        id: me.id,
        username: me.username,
        email: me.email,
        phone: me.phone,
        avatar: me.avatar || "",
        createdAt: me.createdAt || "",
        updatedAt: me.updatedAt || "",
    };
}

module.exports = { register, login, googleLogin, getMe };
