const adminAuthService = require("../services/adminAuthService");
const { cookieOptions, cookieExpires } = require("../utils/cookie");

const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        const { admin, token, session } = await adminAuthService.loginAdmin({ email, password });

        // the same as current authController logic (set cookie httpOnly)
        res.cookie("admin_token", token, { ...cookieOptions(), maxAge: cookieExpires, path: "/api/admin" });
        return res.json({ admin, session });
    } catch (e) {
        console.error(e);
        return res.status(e.statusCode || 500).json({ message: e.message || "Server error" });
    }
};

const me = async (req, res) => {
    try {
        const admin = await adminAuthService.getAdminMe(req);
        if (!admin) return res.status(401).json({ message: "Unauthorized" });
        return res.json({ admin });
    } catch (e) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};

const logout = (req, res) => {
    res.clearCookie("admin_token", { ...cookieOptions(), maxAge: 0, path: "/api/admin" });
    return res.json({ loggedOut: true });
};

module.exports = { login, me, logout };
