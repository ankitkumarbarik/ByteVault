const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const { generateTokens, verifyRefreshToken } = require("../utils/jwt");
const logger = require("../config/logger");

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const userResult = await query(
            "SELECT id FROM users WHERE email = $1",
            [email],
        );
        if (userResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: { message: "User already exists" },
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const newUserResult = await query(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
            [email, passwordHash],
        );

        const user = newUserResult.rows[0];

        const tokens = generateTokens(user.id);

        res.status(201).json({
            success: true,
            data: {
                user: { id: user.id, email: user.email },
                tokens,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const userResult = await query(
            "SELECT id, email, password_hash FROM users WHERE email = $1",
            [email],
        );
        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: { message: "Invalid credentials" },
            });
        }

        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: { message: "Invalid credentials" },
            });
        }

        const tokens = generateTokens(user.id);

        res.status(200).json({
            success: true,
            data: {
                user: { id: user.id, email: user.email },
                tokens,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
exports.refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                error: { message: "Refresh token required" },
            });
        }

        try {
            const decoded = verifyRefreshToken(refreshToken);
            const userResult = await query(
                "SELECT id FROM users WHERE id = $1",
                [decoded.id],
            );

            if (userResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: { message: "User not found" },
                });
            }

            const tokens = generateTokens(decoded.id);

            res.status(200).json({
                success: true,
                data: {
                    tokens,
                },
            });
        } catch (error) {
            return res.status(401).json({
                success: false,
                error: { message: "Invalid refresh token" },
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user (client-side clears tokens, we just log it)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};
