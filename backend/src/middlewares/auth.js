const { verifyAccessToken } = require("../utils/jwt");

const protect = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return res
            .status(401)
            .json({
                success: false,
                error: { message: "Not authorized, no token provided" },
            });
    }

    try {
        const decoded = verifyAccessToken(token);
        req.user = { id: decoded.id };
        next();
    } catch (error) {
        return res
            .status(401)
            .json({
                success: false,
                error: { message: "Not authorized, token failed" },
            });
    }
};

module.exports = protect;
