const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Find user
    const result = await pool.query(
      `SELECT id, name, email, password_hash
       FROM users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Get user's membership and role
    const membershipResult = await pool.query(
      `SELECT
         role,
         tenant_id,
         organization_id
       FROM memberships
       WHERE user_id = $1`,
      [user.id]
    );

    if (membershipResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "User has no organization membership"
      });
    }

    const membership = membershipResult.rows[0];

    // Generate JWT with role and tenant information
    const token = jwt.sign(
      {
        userId: user.id,
        role: membership.role,
        tenantId: membership.tenant_id,
        organizationId: membership.organization_id
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
        tenantId: membership.tenant_id,
        organizationId: membership.organization_id
      }
    });

  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = { login };