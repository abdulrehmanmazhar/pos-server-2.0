import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { addOrder, addOrderPayment, createCart, createOrder, deleteCart, deleteOrder, getAllOrders, getOrder, returnOrderUdhar } from "../controllers/order.controller";
import { PDFgenerator } from "../utils/puppeteer";
const router = express.Router();

router.post("/fill-cart/:id",isAuthenticated, createCart);
router.post("/create-order/:id",isAuthenticated, createOrder);
// router.put("/edit-cart/:id/:index",isAuthenticated,  editCart);
router.delete("/delete-cart/:id/:index",isAuthenticated,  deleteCart);
router.post("/add-order/:id",isAuthenticated,  addOrder);
router.post("/add-order-payment/:id",isAuthenticated,  addOrderPayment);
router.post("/return-order-udhar/:id",isAuthenticated,  returnOrderUdhar);
router.delete('/delete-order/:id',isAuthenticated, authorizeRoles("admin"), deleteOrder)
router.get("/get-order/:id",isAuthenticated,getOrder);
router.get("/get-orders",isAuthenticated, getAllOrders);



export default router