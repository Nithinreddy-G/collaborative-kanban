require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");

const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const boardRoutes = require("./routes/boardRoutes");
const taskRoutes = require("./routes/taskRoutes");
const activityRoutes = require("./routes/activityRoutes");

const authMiddleware = require("./middleware/authMiddleware");
const initializeSocket = require("./sockets/socketServer");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/activities", activityRoutes);

app.get("/", (req, res) => {
  res.send("Collaborative Kanban API is running!");
});

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.status(200).json({
      success: true,
      message: "Database connected successfully!",
      time: result.rows[0].now
    });

  } catch (error) {
    console.error("Health check error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  }
});

app.get("/api/protected", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: "JWT authentication successful!",
    user: req.user
  });
});

// Socket.IO
const io = initializeSocket(server);
app.set("io", io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Socket.IO server initialized");
});