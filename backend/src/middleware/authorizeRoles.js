const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          success: false,
          message: "Authentication required."
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action."
        });
      }

      next();
    } catch (error) {
      console.error("Authorization error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Authorization failed."
      });
    }
  };
};

module.exports = authorizeRoles;