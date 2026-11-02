import { io } from "socket.io-client";

const socket = io("https://collaborative-kanban-80k8.onrender.com", {
autoConnect: false,
});

export default socket;
