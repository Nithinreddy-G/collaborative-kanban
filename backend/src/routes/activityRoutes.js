const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// Get activity history accessible to the logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          al.id,
          al.tenant_id,
          al.user_id,
          al.entity_type,
          al.entity_id,
          al.action,
          al.details,
          al.created_at,
          u.email AS user_email,
          t.title AS task_title,
          b.name AS board_name
       FROM activity_logs al
       JOIN users u ON u.id = al.user_id
       JOIN tasks t
         ON t.id = al.entity_id
        AND al.entity_type = 'task'
       JOIN boards b ON b.id = t.board_id
       WHERE EXISTS (
         SELECT 1
         FROM memberships m
         WHERE m.user_id = $1
           AND m.organization_id = b.organization_id
           AND (m.tenant_id = b.tenant_id OR m.tenant_id IS NULL)
       )
       ORDER BY al.created_at DESC
       LIMIT 100`,
      [req.user.userId]
    );

    res.status(200).json({
      success: true,
      activities: result.rows
    });

  } catch (error) {
    console.error("Activity history error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch activity history"
    });
  }
});

module.exports = router;