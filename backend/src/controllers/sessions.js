const { query, pool } = require("../config/db");

// @desc    Get all sessions with filtering, searching, and pagination
// @route   GET /api/sessions
// @access  Private
exports.getSessions = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 50,
            search = "",
            sort = "newest",
        } = req.query;

        const offset = (page - 1) * limit;
        let queryStr = `
            SELECT 
                s.id, s.name, s.description, s.tag, s.is_favorite, s.created_at,
                COUNT(l.id) as link_count
            FROM sessions s
            LEFT JOIN links l ON s.id = l.session_id
            WHERE s.user_id = $1
        `;
        const params = [req.user.id];
        let paramCount = 1;

        if (search) {
            paramCount++;
            queryStr += ` AND (s.name ILIKE $${paramCount} OR s.description ILIKE $${paramCount} OR s.tag ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        queryStr += ` GROUP BY s.id`;

        if (sort === "oldest") {
            queryStr += ` ORDER BY s.created_at ASC`;
        } else {
            queryStr += ` ORDER BY s.created_at DESC`;
        }

        paramCount++;
        queryStr += ` LIMIT $${paramCount}`;
        params.push(limit);

        paramCount++;
        queryStr += ` OFFSET $${paramCount}`;
        params.push(offset);

        const result = await query(queryStr, params);

        let countQueryStr = `SELECT COUNT(*) FROM sessions s WHERE s.user_id = $1`;
        const countParams = [req.user.id];
        let cpCount = 1;
        if (search) {
            cpCount++;
            countQueryStr += ` AND (s.name ILIKE $${cpCount} OR s.description ILIKE $${cpCount} OR s.tag ILIKE $${cpCount})`;
            countParams.push(`%${search}%`);
        }

        const countResult = await query(countQueryStr, countParams);
        const total = parseInt(countResult.rows[0].count, 10);

        res.status(200).json({
            success: true,
            data: result.rows.map(row => ({...row, link_count: parseInt(row.link_count, 10)})),
            page: parseInt(page, 10),
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new session
// @route   POST /api/sessions
// @access  Private
exports.createSession = async (req, res, next) => {
    try {
        const { name, description, tag, is_favorite } = req.body;

        const result = await query(
            "INSERT INTO sessions (user_id, name, description, tag, is_favorite) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [req.user.id, name, description, tag, is_favorite || false]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a session
// @route   PUT /api/sessions/:id
// @access  Private
exports.updateSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, tag, is_favorite } = req.body;

        const result = await query(
            "UPDATE sessions SET name = COALESCE($1, name), description = COALESCE($2, description), tag = COALESCE($3, tag), is_favorite = COALESCE($4, is_favorite) WHERE id = $5 AND user_id = $6 RETURNING *",
            [name, description, tag, is_favorite, id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: "Session not found" } });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a session
// @route   DELETE /api/sessions/:id
// @access  Private
exports.deleteSession = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(
            "DELETE FROM sessions WHERE id = $1 AND user_id = $2 RETURNING id",
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: "Session not found" } });
        }

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};
