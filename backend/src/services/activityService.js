const pool = require("../config/db");

const logActivity = async ({
  tenantId,
  userId,
  entityType,
  entityId,
  action,
  details = {}
}) => {
  await pool.query(
    `INSERT INTO activity_logs
     (tenant_id, user_id, entity_type, entity_id, action, details, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [
      tenantId,
      userId,
      entityType,
      entityId,
      action,
      JSON.stringify(details)
    ]
  );
};

module.exports = logActivity;