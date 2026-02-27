const express = require("express");
const { z } = require("zod");
const { register, login, refresh, logout } = require("../controllers/auth");
const validate = require("../middlewares/validate");
const protect = require("../middlewares/auth");

const router = express.Router();

const authSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(6, "Password must be at least 6 characters"),
    }),
});

const refreshSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, "Refresh token is required"),
    }),
});

router.post("/register", validate(authSchema), register);
router.post("/login", validate(authSchema), login);
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", protect, logout);

module.exports = router;
