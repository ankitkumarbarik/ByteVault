require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const logger = require("./config/logger");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            const allowed =
                origin.startsWith("chrome-extension://") ||
                origin.startsWith("moz-extension://") ||
                origin.startsWith("safari-web-extension://") ||
                origin.startsWith("http://localhost");
            return allowed
                ? callback(null, true)
                : callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    }),
);

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: {
            message:
                "Too many requests from this IP, please try again after 15 minutes",
        },
    },
});
app.use("/api/", limiter);

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging - Removed noisy global requests logger
// Use morgan or explicitly debug routes instead for production
app.use((req, res, next) => {
    next();
});

// Health Check
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "API is running",
        timestamp: new Date(),
    });
});

// API Routes (To be mounted later)
app.use("/api/auth", require("./routes/auth"));
app.use("/api/links", require("./routes/links"));
app.use("/api/sessions", require("./routes/sessions"));
app.use("/api/export", require("./routes/export"));

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: { message: "Route not found" },
    });
});

// Central Error Handler
app.use(errorHandler);

const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 5252;

const startServer = async () => {
    // 5. Ensure server does NOT start if database fails.
    await connectDB();

    app.listen(PORT, () => {
        logger.info(
            `Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`,
        );
    });
};

startServer();
