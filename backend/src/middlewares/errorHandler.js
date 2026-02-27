const logger = require("../config/logger");

const errorHandler = (err, req, res, next) => {
    logger.error(err.message, {
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
    });

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
        success: false,
        error: {
            message:
                process.env.NODE_ENV === "production" && statusCode === 500
                    ? "Something went wrong on our end."
                    : message,
            ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
        },
    });
};

module.exports = errorHandler;
