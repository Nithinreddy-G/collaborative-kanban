const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// Get tasks for a board
router.get("/board/:boardId", authMiddleware, async (req, res) => {
  try {
    const { boardId } = req.params;

    const result = await pool.query(
      `SELECT
       t.*,
       c.name AS column_name
       FROM tasks t
       JOIN columns c ON c.id = t.column_id
       JOIN boards b ON b.id = t.board_id
       JOIN memberships m
         ON m.user_id = $1
        AND m.organization_id = b.organization_id
        AND (m.tenant_id = b.tenant_id OR m.tenant_id IS NULL)
       WHERE t.board_id = $2
       ORDER BY t.position ASC`,
      [req.user.userId, boardId]
    );

    res.status(200).json({
      success: true,
      tasks: result.rows
    });
  } catch (error) {
    console.error("Get tasks error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks"
    });
  }
});

// Create task
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { board_id, column_id, title, description, assigned_to } = req.body;

    if (!board_id || !column_id || !title) {
      return res.status(400).json({
        success: false,
        message: "Board, column and title are required"
      });
    }

    const access = await pool.query(
      `SELECT b.tenant_id
       FROM boards b
       JOIN memberships m
         ON m.user_id = $1
        AND m.organization_id = b.organization_id
        AND (m.tenant_id = b.tenant_id OR m.tenant_id IS NULL)
       WHERE b.id = $2`,
      [req.user.userId, board_id]
    );

    if (!access.rows.length) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const tenantId = access.rows[0].tenant_id;

    const validColumn = await pool.query(
      `SELECT id FROM columns
       WHERE id = $1 AND board_id = $2`,
      [column_id, board_id]
    );

    if (!validColumn.rows.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid column for this board"
      });
    }

    const result = await pool.query(
      `INSERT INTO tasks
       (board_id, column_id, tenant_id, title, description,
        assigned_to, position, version, created_at, updated_at)
       VALUES (
         $1, $2, $3, $4, $5, $6,
         COALESCE((SELECT MAX(position) + 1 FROM tasks WHERE column_id = $2), 0),
         1, NOW(), NOW()
       )
       RETURNING *`,
      [
        board_id,
        column_id,
        tenantId,
        title,
        description || null,
        assigned_to || null
      ]
    );

    res.status(201).json({
      success: true,
      task: result.rows[0]
    });
  } catch (error) {
    console.error("Create task error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create task"
    });
  }
});
// Get columns for a board
router.get("/board/:boardId/columns", authMiddleware, async (req, res) => {
  try {
    const { boardId } = req.params;

    const result = await pool.query(
      `SELECT c.id, c.name, c.position
       FROM columns c
       JOIN boards b ON b.id = c.board_id
       JOIN memberships m
         ON m.user_id = $1
        AND m.organization_id = b.organization_id
        AND (m.tenant_id = b.tenant_id OR m.tenant_id IS NULL)
       WHERE b.id = $2
       ORDER BY c.position ASC`,
      [req.user.userId, boardId]
    );

    res.status(200).json({
      success: true,
      columns: result.rows
    });
  } catch (error) {
    console.error("Get columns error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch columns"
    });
  }
});
// Move task to another column
router.put("/:taskId/move", authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const { taskId } = req.params;
    const { column_id, expected_version } = req.body;

    if (!column_id || expected_version === undefined) {
      return res.status(400).json({
        success: false,
        message: "Destination column and expected version are required"
      });
    }

    await client.query("BEGIN");

    // Check task access and lock the task
    const taskResult = await client.query(
      `SELECT t.*, b.organization_id, b.tenant_id AS board_tenant_id
       FROM tasks t
       JOIN boards b ON b.id = t.board_id
       JOIN memberships m
         ON m.user_id = $1
        AND m.organization_id = b.organization_id
        AND (m.tenant_id = b.tenant_id OR m.tenant_id IS NULL)
       WHERE t.id = $2
       FOR UPDATE OF t`,
      [req.user.userId, taskId]
    );

    if (!taskResult.rows.length) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Task not found or access denied"
      });
    }

    const task = taskResult.rows[0];

    // Check version to prevent conflicting updates
    if (Number(task.version) !== Number(expected_version)) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Task was updated by another user. Please refresh."
      });
    }

    // Validate destination column belongs to the same board
    const columnResult = await client.query(
      `SELECT id FROM columns
       WHERE id = $1 AND board_id = $2`,
      [column_id, task.board_id]
    );

    if (!columnResult.rows.length) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Invalid destination column"
      });
    }

    // Find the next position in the destination column
    const positionResult = await client.query(
      `SELECT COALESCE(MAX(position) + 1, 0) AS next_position
       FROM tasks
       WHERE column_id = $1`,
      [column_id]
    );

    const nextPosition = positionResult.rows[0].next_position;

    // Update task and increment version
    const updateResult = await client.query(
      `UPDATE tasks
       SET column_id = $1,
           position = $2,
           version = version + 1,
           updated_at = NOW()
       WHERE id = $3 AND version = $4
       RETURNING *`,
      [column_id, nextPosition, taskId, expected_version]
    );

    if (!updateResult.rows.length) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Task update conflict. Please refresh."
      });
    }

    await client.query("COMMIT");

// Broadcast task movement to everyone in the same board
const io = req.app.get("io");

io.to(`board-${task.board_id}`).emit("task-updated", {
  boardId: task.board_id,
  task: updateResult.rows[0]
});

res.status(200).json({
  success: true,
  message: "Task moved successfully",
  task: updateResult.rows[0]
});

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Move task error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to move task"
    });
  } finally {
    client.release();
  }
});

module.exports = router;