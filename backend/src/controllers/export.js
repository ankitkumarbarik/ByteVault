const { query } = require("../config/db");

// @desc    Export all user links as JSON
// @route   GET /api/export/json
// @access  Private
exports.exportJson = async (req, res, next) => {
    try {
        const queryStr = `
      SELECT 
        l.id, l.url, l.title, l.favicon, l.created_at
      FROM links l
      WHERE l.user_id = $1
      ORDER BY l.created_at DESC
    `;

        const result = await query(queryStr, [req.user.id]);

        const exportData = {
            version: "1.0",
            exported_at: new Date().toISOString(),
            links: result.rows,
        };

        res.setHeader("Content-Type", "application/json");
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=bytevault_export.json",
        );

        res.status(200).send(JSON.stringify(exportData, null, 2));
    } catch (error) {
        next(error);
    }
};
