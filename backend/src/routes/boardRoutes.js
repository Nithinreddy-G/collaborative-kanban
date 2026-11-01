const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// Get all boards accessible to the logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         b.id,
         b.organization_id,
         b.tenant_id,
         b.name,
         b.description,
         b.created_by,
         b.created_at
       FROM boards b
       JOIN memberships m
         ON m.user_id = $1
        AND m.organization_id = b.organization_id
        AND (
          m.tenant_id = b.tenant_id
          OR m.tenant_id IS NULL
        )
       ORDER BY b.created_at DESC`,
      [req.user.userId]
    );

    res.status(200).json({
      success: true,
      boards: result.rows
    });
  } catch (error) {
    console.error("Get boards error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch boards"
    });
  }
});

module.exports = router;