import { useState, useEffect } from "react";
import socket from "./socket";

import {
  DndContext,
  closestCorners,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

import { CSS } from "@dnd-kit/utilities";
import "./App.css";

const API = "http://localhost:5000";

// ==========================================
// DRAGGABLE TASK CARD
// ==========================================

function TaskCard({ task, canEdit, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `task-${task.id}`,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="task-card"
    >
      <h4>{task.title}</h4>
      <p>{task.description || "No description"}</p>

      {canEdit && (
        <button
          type="button"
          className="edit-task-button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onEdit(task);
          }}
        >
          Edit
        </button>
      )}
    </div>
  );
}

// ==========================================
// DROPPABLE KANBAN COLUMN
// ==========================================

function KanbanColumn({ column, tasks, canEdit, onEdit }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { columnId: column.id },
  });

  return (
    <div
      ref={setNodeRef}
      className="kanban-column"
      style={{
        background: isOver ? "#e8edff" : undefined,
      }}
    >
      <div className="column-heading">
        <h3>{column.name}</h3>
        <span>{tasks.length}</span>
      </div>

      {tasks.length === 0 ? (
        <p className="empty-message">Drop tasks here</p>
      ) : (
        tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            canEdit={canEdit}
            onEdit={onEdit}
          />
        ))
      )}
    </div>
  );
}

// ==========================================
// MAIN APP
// ==========================================

function App() {
  // Login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  // User states
  const [currentUser, setCurrentUser] = useState(null);

  const canEditTasks = [
    "ORG_ADMIN",
    "TENANT_ADMIN",
  ].includes(currentUser?.role);

  // Board states
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [boardColumns, setBoardColumns] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Add task states
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskColumn, setNewTaskColumn] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  // Edit task states
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Activity history states
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [showActivityHistory, setShowActivityHistory] = useState(false);

  // ==========================================
  // FETCH USER AND BOARDS AFTER LOGIN
  // ==========================================

  useEffect(() => {
    if (token) {
      fetchBoards();
      fetchCurrentUser();
    }
  }, [token]);

  // ==========================================
  // FETCH CURRENT USER DETAILS
  // ==========================================

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API}/api/protected`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch user details");
      }

      setCurrentUser(data.user);

    } catch (err) {
      setError(err.message);
    }
  };

  // ==========================================
  // FETCH BOARDS
  // ==========================================

  const fetchBoards = async () => {
    try {
      const response = await fetch(`${API}/api/boards`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch boards");
      }

      setBoards(data.boards || []);

    } catch (err) {
      setError(err.message);
    }
  };

  // ==========================================
  // FETCH TASKS AND COLUMNS
  // ==========================================

  const loadBoardData = async (boardId) => {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const [taskResponse, columnResponse] = await Promise.all([
      fetch(`${API}/api/tasks/board/${boardId}`, { headers }),
      fetch(`${API}/api/tasks/board/${boardId}/columns`, { headers }),
    ]);

    const taskData = await taskResponse.json();
    const columnData = await columnResponse.json();

    if (!taskResponse.ok) {
      throw new Error(taskData.message || "Failed to fetch tasks");
    }

    if (!columnResponse.ok) {
      throw new Error(columnData.message || "Failed to fetch columns");
    }

    setTasks(taskData.tasks || []);
    setBoardColumns(columnData.columns || []);
  };

  // ==========================================
  // OPEN A BOARD
  // ==========================================

  const fetchTasks = async (board) => {
    setSelectedBoard(board);
    setShowActivityHistory(false);
    setTasks([]);
    setBoardColumns([]);
    setTasksLoading(true);
    setError("");
    setShowAddTask(false);
    setEditingTask(null);

    try {
      await loadBoardData(board.id);

    } catch (err) {
      setError(err.message);

    } finally {
      setTasksLoading(false);
    }
  };

  // ==========================================
  // FETCH ACTIVITY HISTORY
  // ==========================================

  const fetchActivityHistory = async () => {
    setActivitiesLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/activities`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch activity history"
        );
      }

      setActivities(data.activities || []);
      setShowActivityHistory(true);

    } catch (err) {
      setError(err.message);

    } finally {
      setActivitiesLoading(false);
    }
  };

  // ==========================================
  // SOCKET.IO REAL-TIME UPDATES
  // ==========================================

  useEffect(() => {
    if (!token || !selectedBoard) return;

    socket.connect();

    const joinBoard = () => {
      socket.emit("join-board", selectedBoard.id);
    };

    const handleTaskUpdated = () => {
      loadBoardData(selectedBoard.id).catch((err) => {
        setError(err.message);
      });
    };

    socket.on("connect", joinBoard);
    socket.on("task-updated", handleTaskUpdated);

    if (socket.connected) {
      joinBoard();
    }

    return () => {
      socket.off("connect", joinBoard);
      socket.off("task-updated", handleTaskUpdated);
      socket.disconnect();
    };

  }, [token, selectedBoard]);

  // ==========================================
  // HANDLE DRAG AND DROP
  // ==========================================

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) return;

    const task = active.data.current?.task;
    const destinationColumnId = over.data.current?.columnId;

    if (!task || !destinationColumnId) return;

    if (String(task.column_id) === String(destinationColumnId)) {
      return;
    }

    const previousTasks = [...tasks];

    // Optimistic UI update
    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === task.id
          ? {
              ...item,
              column_id: destinationColumnId,
              column_name:
                boardColumns.find(
                  (column) =>
                    String(column.id) === String(destinationColumnId)
                )?.name || item.column_name,
            }
          : item
      )
    );

    try {
      const response = await fetch(
        `${API}/api/tasks/${task.id}/move`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            column_id: destinationColumnId,
            expected_version: task.version,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to move task");
      }

      await loadBoardData(selectedBoard.id);
      setError("");

    } catch (err) {
      setTasks(previousTasks);
      setError(err.message);
    }
  };

  // ==========================================
  // CREATE A NEW TASK
  // ==========================================

  const handleCreateTask = async (e) => {
    e.preventDefault();

    if (!newTaskTitle.trim() || !newTaskColumn) {
      setError("Please enter a task title and select a column.");
      return;
    }

    setSavingTask(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          board_id: selectedBoard.id,
          column_id: newTaskColumn,
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create task");
      }

      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskColumn("");
      setShowAddTask(false);

      await loadBoardData(selectedBoard.id);

    } catch (err) {
      setError(err.message);

    } finally {
      setSavingTask(false);
    }
  };

  // ==========================================
  // OPEN EDIT TASK FORM
  // ==========================================

  const openEditTask = (task) => {
    setEditingTask(task);
    setEditTitle(task.title || "");
    setEditDescription(task.description || "");
    setEditAssignedTo(task.assigned_to || "");
    setError("");
  };

  // ==========================================
  // UPDATE TASK
  // ==========================================

  const handleUpdateTask = async (e) => {
    e.preventDefault();

    if (!editingTask || !editTitle.trim()) {
      setError("Task title is required.");
      return;
    }

    setSavingEdit(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/api/tasks/${editingTask.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: editTitle.trim(),
            description: editDescription,
            assigned_to: editAssignedTo.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update task");
      }

      setEditingTask(null);
      setEditTitle("");
      setEditDescription("");
      setEditAssignedTo("");

      await loadBoardData(selectedBoard.id);

    } catch (err) {
      setError(err.message);

    } finally {
      setSavingEdit(false);
    }
  };

  // ==========================================
  // LOGIN
  // ==========================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);

    } catch (err) {
      setError(err.message);

    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    socket.disconnect();
    localStorage.removeItem("token");

    setToken("");
    setBoards([]);
    setTasks([]);
    setBoardColumns([]);
    setSelectedBoard(null);
    setCurrentUser(null);

    setEmail("");
    setPassword("");
    setError("");
    setShowAddTask(false);
    setEditingTask(null);

    setActivities([]);
    setShowActivityHistory(false);
  };

  // ==========================================
  // LOGIN PAGE
  // ==========================================

  if (!token) {
    return (
      <div className="login-container">
        <form className="login-form" onSubmit={handleLogin}>
          <h1>Collaborative Kanban</h1>
          <p>Sign in to manage your tasks</p>

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    );
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  return (
    <div className="dashboard">

      <header className="main-header">
        <h1>Collaborative Kanban</h1>
        <button onClick={handleLogout}>Logout</button>
      </header>

      <main>

        {!selectedBoard ? (

          showActivityHistory ? (

            // ACTIVITY HISTORY PAGE

            <section className="activity-history">

              <div className="board-heading">
                <h2>Activity History</h2>

                <button
                  onClick={() => {
                    setShowActivityHistory(false);
                    setError("");
                  }}
                >
                  Back to Boards
                </button>
              </div>

              {error && <p className="error">{error}</p>}

              {activitiesLoading ? (

                <p>Loading activity history...</p>

              ) : activities.length === 0 ? (

                <p>No activities found.</p>

              ) : (

                <div className="activity-list">

                  {activities.map((activity) => (

                    <div
                      className="activity-card"
                      key={activity.id}
                    >

                      <h3>{activity.user_email}</h3>

                      <p>
                        <strong>Action:</strong>{" "}
                        {activity.action === "task_created" ||
                        activity.action === "created"
                          ? "Created a task"
                          : activity.action === "task_moved"
                          ? "Moved a task"
                          : activity.action === "task_updated"
                          ? "Updated a task"
                          : activity.action}
                      </p>

                      <p>
                        <strong>Task:</strong>{" "}
                        {activity.task_title ||
                          activity.details?.title ||
                          "Unknown task"}
                      </p>

                      <p>
                        <strong>Board:</strong>{" "}
                        {activity.board_name || "Unknown board"}
                      </p>

                      <p>
                        <strong>Date:</strong>{" "}
                        {new Date(
                          activity.created_at
                        ).toLocaleString()}
                      </p>

                    </div>

                  ))}

                </div>

              )}

            </section>

          ) : (

            // BOARDS DASHBOARD

            <>

              <h2>Welcome to your Dashboard!</h2>
              <h2>Your Boards</h2>

              {error && <p className="error">{error}</p>}

              <button
                onClick={fetchActivityHistory}
                style={{ margin: "15px 0" }}
              >
                View Activity History
              </button>

              <div className="boards-container">

                {boards.map((board) => (

                  <div className="board-card" key={board.id}>

                    <h3>{board.name}</h3>

                    <p>
                      {board.description || "No description"}
                    </p>

                    <button onClick={() => fetchTasks(board)}>
                      Open Board
                    </button>

                  </div>

                ))}

              </div>

            </>

          )

        ) : (

          // KANBAN BOARD PAGE

          <section className="kanban-section">

            <div className="board-heading">

              <div>
                <h2>{selectedBoard.name}</h2>

                <p>
                  Drag tasks between columns to update their status.
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedBoard(null);
                  setShowAddTask(false);
                  setEditingTask(null);
                  setError("");
                }}
              >
                Back to Boards
              </button>

            </div>

            {error && <p className="error">{error}</p>}

            {/* ADD TASK */}

            <div className="add-task-area">

              {canEditTasks && (
                <button
                  onClick={() => {
                    setShowAddTask(!showAddTask);
                    setError("");
                  }}
                >
                  {showAddTask ? "Cancel" : "+ Add Task"}
                </button>
              )}

              {showAddTask && canEditTasks && (

                <form
                  onSubmit={handleCreateTask}
                  className="add-task-form"
                >

                  <h3>Create New Task</h3>

                  <input
                    type="text"
                    placeholder="Task title"
                    value={newTaskTitle}
                    onChange={(e) =>
                      setNewTaskTitle(e.target.value)
                    }
                    required
                  />

                  <textarea
                    placeholder="Task description"
                    value={newTaskDescription}
                    onChange={(e) =>
                      setNewTaskDescription(e.target.value)
                    }
                  />

                  <select
                    value={newTaskColumn}
                    onChange={(e) =>
                      setNewTaskColumn(e.target.value)
                    }
                    required
                  >

                    <option value="">Select column</option>

                    {boardColumns.map((column) => (

                      <option
                        key={column.id}
                        value={column.id}
                      >
                        {column.name}
                      </option>

                    ))}

                  </select>

                  <button type="submit" disabled={savingTask}>
                    {savingTask ? "Saving..." : "Save Task"}
                  </button>

                </form>

              )}

            </div>

            {/* EDIT TASK FORM */}

            {editingTask && canEditTasks && (

              <form
                onSubmit={handleUpdateTask}
                className="add-task-form edit-task-form"
              >

                <h3>Edit Task</h3>

                <input
                  type="text"
                  placeholder="Task title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />

                <textarea
                  placeholder="Task description"
                  value={editDescription}
                  onChange={(e) =>
                    setEditDescription(e.target.value)
                  }
                />

                <input
                  type="text"
                  placeholder="Assigned user ID (optional)"
                  value={editAssignedTo}
                  onChange={(e) =>
                    setEditAssignedTo(e.target.value)
                  }
                />

                <button type="submit" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>

              </form>

            )}

            {/* KANBAN COLUMNS */}

            {tasksLoading ? (

              <p>Loading tasks...</p>

            ) : (

              <DndContext
                collisionDetection={closestCorners}
                onDragEnd={handleDragEnd}
              >

                <div className="kanban-board">

                  {boardColumns.map((column) => {

                    const columnTasks = tasks
                      .filter(
                        (task) =>
                          String(task.column_id) === String(column.id)
                      )
                      .sort((a, b) => a.position - b.position);

                    return (

                      <KanbanColumn
                        key={column.id}
                        column={column}
                        tasks={columnTasks}
                        canEdit={canEditTasks}
                        onEdit={openEditTask}
                      />

                    );

                  })}

                </div>

              </DndContext>

            )}

          </section>

        )}

      </main>

    </div>
  );
}

export default App;