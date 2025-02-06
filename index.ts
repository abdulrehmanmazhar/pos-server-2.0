require("dotenv").config();
import { app } from "./app";
import { runScheduler } from "./services/order.service";
import connectDB from "./utils/db";

// create server
app.listen(process.env.PORT, ()=>{
    console.log("Server is running on", process.env.PORT);
    connectDB();
    runScheduler();
})