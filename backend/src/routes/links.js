const express = require("express");
const { z } = require("zod");
const {
    getLinks,
    createLink,
    deleteLink,
    bulkDeleteLinks,
} = require("../controllers/links");
const validate = require("../middlewares/validate");
const protect = require("../middlewares/auth");

const router = express.Router();

const getLinksSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        search: z.string().optional(),
        sort: z.enum(["newest", "oldest"]).optional(),
        session_id: z.string().optional(),
    }),
});

const createLinkSchema = z.object({
    body: z.object({
        url: z.string().min(1, "URL is required"),
        title: z.string().max(500).optional(),
        favicon: z.string().max(2048).optional().nullable(),
        session_id: z.string().uuid().optional().nullable(),
    }),
});

const deleteLinkSchema = z.object({
    params: z.object({
        id: z.string().uuid("Invalid link ID format"),
    }),
});

const bulkDeleteSchema = z.object({
    body: z.object({
        ids: z.array(z.string().uuid()).min(1),
    }),
});

router.use(protect); // All link routes are protected

router
    .route("/")
    .get(validate(getLinksSchema), getLinks)
    .post(validate(createLinkSchema), createLink)
    .delete(validate(bulkDeleteSchema), bulkDeleteLinks);

router.route("/:id").delete(validate(deleteLinkSchema), deleteLink);

module.exports = router;
