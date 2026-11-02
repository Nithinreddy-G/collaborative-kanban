const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");
const logActivity = require("../services/activityService");

// ==========================================
// GET TASKS FOR A BOARD
// ==========================================

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


// ==========================================
// CREATE TASK
// ORG_ADMIN AND TENANT_ADMIN ONLY
// ==========================================

router.post(
  "/",
  authMiddleware,
  authorizeRoles("ORG_ADMIN", "TENANT_ADMIN"),
  async (req, res) => {
    try {
      const {
        board_id,
        column_id,
        title,
        description,
        assigned_to
      } = req.body;

      if (
        !board_id ||
        !column_id ||
        typeof title !== "string" ||
        !title.trim()
      ) {
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
          message: "Access denied to this board"
        });
      }

      const tenantId = access.rows[0].tenant_id;

      const validColumn = await pool.query(
        `SELECT id
         FROM columns
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
         (
           board_id,
           column_id,
           tenant_id,
           title,
           description,
           assigned_to,
           position,
           version,
           created_at,
           updated_at
         )
         VALUES (
           $1, $2, $3, $4, $5, $6,
           COALESCE(
             (
               SELECT MAX(position) + 1
               FROM tasks
               WHERE column_id = $2
             ),
             0
           ),
           1,
           NOW(),
           NOW()
         )
         RETURNING *`,
        [
          board_id,
          column_id,
          tenantId,
          title.trim(),
          description || null,
          assigned_to || null
        ]
      );

      const newTask = result.rows[0];

      try {
        await logActivity({
          tenantId,
          userId: req.user.userId,
          entityType: "task",
          entityId: newTask.id,
          action: "task_created",
          details: {
            title: newTask.title,
            board_id,
            column_id
          }
        });
      } catch (logError) {
        console.error("Task creation activity log error:", logError.message);
      }

      const io = req.app.get("io");

      if (io) {
        io.to(`board-${board_id}`).emit("task-updated", {
          boardId: board_id,
          task: newTask
        });
      }

      res.status(201).json({
        success: true,
        message: "Task created successfully",
        task: newTask
      });

    } catch (error) {
      console.error("Create task error:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to create task"
      });
    }
  }
);


// ==========================================
// GET COLUMNS FOR A BOARD
// ==========================================

router.get("/board/:boardId/columns", authMiddleware, async (req, res) => {
  try {
    const { boardId } = req.params;

    const result = await pool.query(
      `SELECT
         c.id,
         c.name,
         c.position
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


// ==========================================
// EDIT TASK
// ORG_ADMIN AND TENANT_ADMIN ONLY
// ==========================================

router.put(
  "/:taskId",
  authMiddleware,
  authorizeRoles("ORG_ADMIN", "TENANT_ADMIN"),
  async (req, res) => {
    try {
      const { taskId } = req.params;
      const { title, description, assigned_to } = req.body;

      if (
        title !== undefined &&
        (typeof title !== "string" || !title.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: "Task title must be a non-empty string"
        });
      }

      // Check task access
      const access = await pool.query(
        `SELECT
           t.*,
           b.organization_id,
           b.tenant_id AS board_tenant_id
         FROM tasks t
         JOIN boards b ON b.id = t.board_id
         WHERE t.id = $1
           AND b.organization_id = $2
           AND (
             $3::text = 'ORG_ADMIN'
             OR b.tenant_id = $4
           )`,
        [
          taskId,
          req.user.organizationId,
          req.user.role,
          req.user.tenantId
        ]
      );

      if (!access.rows.length) {
        return res.status(403).json({
          success: false,
          message: "Access denied to edit this task"
        });
      }

      const oldTask = access.rows[0];

      // Preserve existing values when fields are omitted
      const updatedTitle =
        title !== undefined ? title.trim() : oldTask.title;

      const updatedDescription =
        description !== undefined ? description : oldTask.description;

      const updatedAssignedTo =
        assigned_to !== undefined ? assigned_to : oldTask.assigned_to;

      const result = await pool.query(
        `UPDATE tasks
         SET title = $1,
             description = $2,
             assigned_to = $3,
             version = version + 1,
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [
          updatedTitle,
          updatedDescription,
          updatedAssignedTo,
          taskId
        ]
      );

      const updatedTask = result.rows[0];

      // Record activity history
      try {
        await logActivity({
          tenantId: oldTask.tenant_id,
          userId: req.user.userId,
          entityType: "task",
          entityId: updatedTask.id,
          action: "task_updated",
          details: {
            old_title: oldTask.title,
            new_title: updatedTask.title
          }
        });
      } catch (logError) {
        console.error("Task update activity log error:", logError.message);
      }

      // Notify connected users
      const io = req.app.get("io");

      if (io) {
        io.to(`board-${updatedTask.board_id}`).emit("task-updated", {
          boardId: updatedTask.board_id,
          task: updatedTask
        });
      }

      res.status(200).json({
        success: true,
        message: "Task updated successfully",
        task: updatedTask
      });

    } catch (error) {
      console.error("Edit task error:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to update task"
      });
    }
  }
);


// ==========================================
// MOVE TASK
// ALL AUTHENTICATED BOARD MEMBERS
// ==========================================

router.put("/:taskId/move", authMiddleware, async (req, res) => {
  let client;

  try {
    const { taskId } = req.params;
    const { column_id, expected_version } = req.body;

    if (!column_id || expected_version === undefined) {
      return res.status(400).json({
        success: false,
        message: "Destination column and expected version are required"
      });
    }

    client = await pool.connect();

    await client.query("BEGIN");

    const taskResult = await client.query(
      `SELECT
         t.*,
         b.organization_id,
         b.tenant_id AS board_tenant_id
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

    if (Number(task.version) !== Number(expected_version)) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Task was updated by another user. Please refresh."
      });
    }

    const columnResult = await client.query(
      `SELECT id
       FROM columns
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

    const positionResult = await client.query(
      `SELECT COALESCE(MAX(position) + 1, 0) AS next_position
       FROM tasks
       WHERE column_id = $1`,
      [column_id]
    );

    const nextPosition = positionResult.rows[0].next_position;

    const updateResult = await client.query(
      `UPDATE tasks
       SET column_id = $1,
           position = $2,
           version = version + 1,
           updated_at = NOW()
       WHERE id = $3 AND version = $4
       RETURNING *`,
      [
        column_id,
        nextPosition,
        taskId,
        expected_version
      ]
    );

    if (!updateResult.rows.length) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Task update conflict. Please refresh."
      });
    }

    const updatedTask = updateResult.rows[0];

    await client.query("COMMIT");

    // Record activity history
    try {
      await logActivity({
        tenantId: task.tenant_id,
        userId: req.user.userId,
        entityType: "task",
        entityId: task.id,
        action: "task_moved",
        details: {
          title: task.title,
          old_column_id: task.column_id,
          new_column_id: column_id
        }
      });
    } catch (logError) {
      console.error("Task movement activity log error:", logError.message);
    }

    // Notify connected users
    const io = req.app.get("io");

    if (io) {
      io.to(`board-${task.board_id}`).emit("task-updated", {
        boardId: task.board_id,
        task: updatedTask
      });
    }

    res.status(200).json({
      success: true,
      message: "Task moved successfully",
      task: updatedTask
    });

  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError.message);
      }
    }

    console.error("Move task error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to move task"
    });

  } finally {
    if (client) {
      client.release();
    }
  }
});


module.exports = router;