const jwt = require("jsonwebtoken");

const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { id: userId },
        process.env.JWT_ACCESS_SECRET || "fallback_access_secret",
        { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "1h" },
    );

    const refreshToken = jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret",
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" },
    );

    return { accessToken, refreshToken };
};

const verifyAccessToken = (token) => {
    return jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET || "fallback_access_secret",
    );
};

const verifyRefreshToken = (token) => {
    return jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret",
    );
};

module.exports = {
    generateTokens,
    verifyAccessToken,
    verifyRefreshToken,
};
