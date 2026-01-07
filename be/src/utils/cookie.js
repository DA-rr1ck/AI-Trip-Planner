const { AUTH_EXPIRATION } = process.env;

function getCookieExpires() {
    const sec = Number(AUTH_EXPIRATION);
    const ms = Number.isFinite(sec) && sec > 0 ? sec * 1000 : 3600 * 1000; // default 1h
    return ms;
}

const cookieExpires = getCookieExpires();

function cookieOptions() {
    const prod = process.env.BE_ENV === "production";
    return {
        httpOnly: true,
        sameSite: prod ? "strict" : "lax",
        secure: prod,
        maxAge: cookieExpires,
        path: "/",
    };
}

module.exports = { cookieExpires, cookieOptions };
