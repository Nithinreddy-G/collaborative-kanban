const express = require("express");
const router = express.Router();

const pool = require("../config/db");

const { login } = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

// Login API
router.post("/login", login);

// Protected Profile API
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email
       FROM users
       WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    console.error("Profile error:", error.message);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

module.exports = router;