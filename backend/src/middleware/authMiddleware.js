const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch current user role and tenant from database
    const result = await pool.query(
      `SELECT
          u.id AS user_id,
          u.email,
          m.role,
          m.organization_id,
          m.tenant_id
       FROM users u
       JOIN memberships m ON m.user_id = u.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (!result.rows.length) {
      return res.status(403).json({
        success: false,
        message: "User membership not found."
      });
    }

    // Attach authenticated user and role information
    req.user = {
      ...decoded,
      userId: result.rows[0].user_id,
      email: result.rows[0].email,
      role: result.rows[0].role,
      organizationId: result.rows[0].organization_id,
      tenantId: result.rows[0].tenant_id
    };

    next();

  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token."
    });
  }
};

module.exports = authMiddleware;