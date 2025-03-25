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
import os from "os"; // ✅ Import os
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

// ✅ Function to get local IP address
const getLocalIpAddress = (): string => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1'; // Fallback to localhost if no network interface is found
};

// ✅ Get local IP address
const localIpAddress = getLocalIpAddress();

// ✅ Start Server
// server.listen(parseInt(process.env.PORT, 10), localIpAddress, () => {
//     console.log(`Server is running on ${localIpAddress}:${process.env.PORT}`);
//     connectDB();
//     runScheduler();
// });
