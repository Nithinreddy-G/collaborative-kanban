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

// Draggable task card
function TaskCard({ task }) {
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
    </div>
  );
}

// Droppable Kanban column
function KanbanColumn({ column, tasks }) {
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
          <TaskCard key={task.id} task={task} />
        ))
      )}
    </div>
  );
}

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [boardColumns, setBoardColumns] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Fetch boards after login
  useEffect(() => {
    if (token) {
      fetchBoards();
    }
  }, [token]);

  // Fetch boards
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

  // Fetch tasks and columns
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

  // Open a board
  const fetchTasks = async (board) => {
    setSelectedBoard(board);
    setTasks([]);
    setBoardColumns([]);
    setTasksLoading(true);
    setError("");

    try {
      await loadBoardData(board.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setTasksLoading(false);
    }
  };

  // Socket.IO real-time updates
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

  // Handle drag and drop
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) return;

    const task = active.data.current?.task;
    const destinationColumnId = over.data.current?.columnId;

    if (!task || !destinationColumnId) return;

    if (task.column_id === destinationColumnId) return;

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
                  (column) => column.id === destinationColumnId
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

  // Login
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

  // Logout
  const handleLogout = () => {
    socket.disconnect();

    localStorage.removeItem("token");

    setToken("");
    setBoards([]);
    setTasks([]);
    setBoardColumns([]);
    setSelectedBoard(null);
    setEmail("");
    setPassword("");
    setError("");
  };

  // Login page
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

  // Dashboard
  return (
    <div className="dashboard">
      <header className="main-header">
        <h1>Collaborative Kanban</h1>
        <button onClick={handleLogout}>Logout</button>
      </header>

      <main>
        {!selectedBoard ? (
          <>
            <h2>Welcome to your Dashboard!</h2>
            <h2>Your Boards</h2>

            {error && <p className="error">{error}</p>}

            <div className="boards-container">
              {boards.map((board) => (
                <div className="board-card" key={board.id}>
                  <h3>{board.name}</h3>
                  <p>{board.description || "No description"}</p>

                  <button onClick={() => fetchTasks(board)}>
                    Open Board
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <section className="kanban-section">
            <div className="board-heading">
              <div>
                <h2>{selectedBoard.name}</h2>
                <p>
                  Drag tasks between columns to update their status.
                </p>
              </div>

              <button onClick={() => setSelectedBoard(null)}>
                Back to Boards
              </button>
            </div>

            {error && <p className="error">{error}</p>}

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
                        (task) => task.column_id === column.id
                      )
                      .sort((a, b) => a.position - b.position);

                    return (
                      <KanbanColumn
                        key={column.id}
                        column={column}
                        tasks={columnTasks}
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