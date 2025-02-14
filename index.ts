// require("dotenv").config();
// import { app } from "./app";
// import { runScheduler } from "./services/order.service";
// import connectDB from "./utils/db";

// // create server
// app.listen(process.env.PORT, ()=>{
//     console.log("Server is running on", process.env.PORT);
//     connectDB();
//     runScheduler();
// })

require("dotenv").config();
import { app } from "./app";
import { runScheduler } from "./services/order.service";
import connectDB from "./utils/db";
import http from "http";  // ✅ Import http
import { Server } from "socket.io";
import { connectWhatsapp } from "./utils/whatsapp";

// ✅ Create HTTP Server
const server = http.createServer(app);

// ✅ Initialize WebSocket Server (Socket.io)
const io = new Server(server, {
    cors: { origin: "*" }, // Allow frontend connections
});

io.on("connection", (socket) => {
    console.log("Frontend connected to WebSocket");
});

// ✅ Start WhatsApp connection with WebSocket instance
connectWhatsapp(io);

// ✅ Start Server
server.listen(process.env.PORT, () => {
    console.log("Server is running on", process.env.PORT);
    connectDB();
    runScheduler();
});
