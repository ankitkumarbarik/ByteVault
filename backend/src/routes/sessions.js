const express = require("express");
const { z } = require("zod");
const {
    getSessions,
    createSession,
    updateSession,
    deleteSession,
} = require("../controllers/sessions");
const validate = require("../middlewares/validate");
const protect = require("../middlewares/auth");

const router = express.Router();

const getSessionsSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        search: z.string().optional(),
        sort: z.enum(["newest", "oldest"]).optional(),
    }),
});

const createSessionSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Name is required").max(255),
        description: z.string().max(2000).optional().nullable(),
        tag: z.string().max(100).optional().nullable(),
        is_favorite: z.boolean().optional(),
    }),
});

const updateSessionSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid session ID format"),
    }),
    body: z.object({
        name: z.string().max(255).optional(),
        description: z.string().max(2000).optional().nullable(),
        tag: z.string().max(100).optional().nullable(),
        is_favorite: z.boolean().optional(),
    }),
});

const deleteSessionSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid session ID format"),
    }),
});

router.use(protect); // All session routes are protected

router
    .route("/")
    .get(validate(getSessionsSchema), getSessions)
    .post(validate(createSessionSchema), createSession);

router.route("/:id")
    .put(validate(updateSessionSchema), updateSession)
    .delete(validate(deleteSessionSchema), deleteSession);

module.exports = router;
