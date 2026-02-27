const { query, pool } = require("../config/db");

// @desc    Get all links with filtering, searching, and pagination
// @route   GET /api/links
// @access  Private
exports.getLinks = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 50,
            search = "",
            sort = "newest",
            session_id,
        } = req.query;

        const offset = (page - 1) * limit;
        let queryStr = `
      SELECT 
        l.id, l.url, l.title, l.favicon, l.created_at, l.session_id
      FROM links l
      WHERE l.user_id = $1
    `;
        const params = [req.user.id];
        let paramCount = 1;

        if (session_id === "none") {
            queryStr += ` AND l.session_id IS NULL`;
        } else if (session_id) {
            paramCount++;
            queryStr += ` AND l.session_id = $${paramCount}`;
            params.push(session_id);
        }

        if (search) {
            paramCount++;
            queryStr += ` AND (l.title ILIKE $${paramCount} OR l.url ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        if (sort === "oldest") {
            queryStr += ` ORDER BY l.created_at ASC`;
        } else {
            queryStr += ` ORDER BY l.created_at DESC`;
        }

        paramCount++;
        queryStr += ` LIMIT $${paramCount}`;
        params.push(limit);

        paramCount++;
        queryStr += ` OFFSET $${paramCount}`;
        params.push(offset);

        const result = await query(queryStr, params);

        // Get total count for pagination
        let countQueryStr = `SELECT COUNT(DISTINCT l.id) FROM links l WHERE l.user_id = $1`;
        const countParams = [req.user.id];
        let cpCount = 1;

        if (session_id === "none") {
            countQueryStr += ` AND l.session_id IS NULL`;
        } else if (session_id) {
            cpCount++;
            countQueryStr += ` AND l.session_id = $${cpCount}`;
            countParams.push(session_id);
        }
        if (search) {
            cpCount++;
            countQueryStr += ` AND (l.title ILIKE $${cpCount} OR l.url ILIKE $${cpCount})`;
            countParams.push(`%${search}%`);
        }

        const countResult = await query(countQueryStr, countParams);
        const total = parseInt(countResult.rows[0].count, 10);

        res.status(200).json({
            success: true,
            data: result.rows,
            page: parseInt(page, 10),
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new link (and optionally associate tags)
// @route   POST /api/links
// @access  Private
exports.createLink = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { url, title, favicon, session_id } = req.body;

        // Check unique constraint manually to provide better error
        const existing = await client.query(
            "SELECT id FROM links WHERE user_id = $1 AND url = $2",
            [req.user.id, url],
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: { message: "Link already saved" },
            });
        }

        await client.query("BEGIN");

        const result = await client.query(
            "INSERT INTO links (user_id, url, title, favicon, session_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, url, title, favicon, session_id, created_at",
            [req.user.id, url, title, favicon, session_id || null],
        );

        const link = result.rows[0];

        await client.query("COMMIT");

        res.status(201).json({ success: true, data: link });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};

// @desc    Delete a single link
// @route   DELETE /api/links/:id
// @access  Private
exports.deleteLink = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(
            "DELETE FROM links WHERE id = $1 AND user_id = $2 RETURNING id",
            [id, req.user.id],
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: { message: "Link not found or unauthorized" },
            });
        }

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};

// @desc    Bulk delete links
// @route   DELETE /api/links
// @access  Private
exports.bulkDeleteLinks = async (req, res, next) => {
    try {
        const { ids } = req.body; // array of UUIDs

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Please provide an array of link IDs to delete",
                },
            });
        }

        // Use ANY clause for array of IDs
        const result = await query(
            "DELETE FROM links WHERE user_id = $1 AND id = ANY($2::uuid[]) RETURNING id",
            [req.user.id, ids],
        );

        res.status(200).json({
            success: true,
            count: result.rows.length,
            data: {},
        });
    } catch (error) {
        next(error);
    }
};
