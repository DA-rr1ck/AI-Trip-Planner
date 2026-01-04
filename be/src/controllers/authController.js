const authService = require("../services/authService");
const { cookieOptions, cookieExpires } = require("../utils/cookie");

const register = async (req, res) => {
    try {
        const { username, email, phone, password } = req.body || {};

        const { user, token, session } = await authService.register({
            username,
            email,
            phone,
            password,
        });

        res.cookie("token", token, cookieOptions());
        return res.status(201).json({ user, session });
    } catch (e) {
        console.error(e);
        return res.status(e.statusCode || 500).json({ message: e.message || "Server error" });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        const { user, token, session } = await authService.login({
            email,
            password,
        });

        res.cookie("token", token, { ...cookieOptions(), maxAge: cookieExpires });
        return res.json({ user, session });
    } catch (e) {
        console.error(e);
        return res.status(e.statusCode || 500).json({ message: e.message || "Server error" });
    }
};

const google = async (req, res) => {
    try {
        const { accessToken } = req.body || {};
        const { user, token, session } = await authService.googleLogin({ accessToken });

        res.cookie("token", token, { ...cookieOptions(), maxAge: cookieExpires });
        return res.json({ user, session });
    } catch (e) {
        console.error(e);
        return res.status(e.statusCode || 500).json({ message: e.message || "Server error" });
    }
};

const me = async (req, res) => {
    try {
        const user = await authService.getMe(req);
        if (!user) return res.status(401).json({ message: "Unauthorized" });
        return res.json({ user });
    } catch (e) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};

const logout = (req, res) => {
    res.clearCookie("token", { ...cookieOptions(), maxAge: 0 });
    return res.json({ loggedOut: true });
};

module.exports = { register, login, google, me, logout };
