const { Server } = require("socket.io");

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"]
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-board", (boardId) => {
      socket.join(`board-${boardId}`);
      console.log(`User joined board: ${boardId}`);
    });

    socket.on("task-updated", (data) => {
      socket.to(`board-${data.boardId}`).emit("task-updated", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

module.exports = initializeSocket;