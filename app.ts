require("dotenv").config();
import express, { Request, Response, NextFunction } from "express";
export const app = express();
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middleware/error";
import userRouter from "./routes/user.route";
import customerRouter from "./routes/customer.route"
import productRouter from "./routes/product.route"
import orderRouter from "./routes/order.route"
import transactionRouter from "./routes/transaction.route"
import analyticsRouter from "./routes/analytics.route"
import productSaleRouter from "./routes/productSale.route";
import http from 'http';
import { Server } from 'socket.io';
import { connectWhatsapp } from "./utils/whatsapp";

app.use(express.static('public'));


// body parser
app.use(express.json({ limit: "50kb" }));

// cookie parser
app.use(cookieParser());

// cors
app.use(cors({
    origin: (origin, callback) => {
        console.log(origin)
      // Allow all origins dynamically
      callback(null, origin || '*');
    },
    credentials: true, // Enable credentials
  }));

  // whatsapp 
  const server = http.createServer(app);
  const io = new Server(server, {
      cors: { origin: '*' } // Allow frontend to connect
  });
  io.on('connection', (socket) => {
    console.log('Frontend connected to WebSocket');
});

// Start WhatsApp connection with WebSocket instance
connectWhatsapp(io);

app.use("/api/v1", userRouter);
app.use("/api/v1", customerRouter);
app.use("/api/v1", productRouter);
app.use("/api/v1", orderRouter);
app.use("/api/v1", transactionRouter);
app.use("/api/v1", analyticsRouter);
app.use("/api/v1", productSaleRouter);


app.get("/test", (req,res)=>{
    res.status(200).json({
        success: true,
        message: "test route called and it worked properly"
    })
});

// unknown route 
app.all("*", (req: Request, res: Response, next: NextFunction) => {
    const err = new Error(`Can't find ${req.originalUrl} on this server`) as any;
    err.statusCode = 404;
    next(err);
});

app.use(errorMiddleware);
