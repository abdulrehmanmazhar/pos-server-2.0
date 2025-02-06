import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { addOrder, createCart, deleteCart, deleteOrder, getAllOrders, getOrder } from "../controllers/order.controller";
import { PDFgenerator } from "../utils/puppeteer";
const router = express.Router();

router.post("/fill-cart/:id",isAuthenticated, createCart);
// router.put("/edit-cart/:id/:index",isAuthenticated,  editCart);
router.delete("/delete-cart/:id/:index",isAuthenticated,  deleteCart);
router.post("/add-order/:id",isAuthenticated,  addOrder);
router.delete('/delete-order/:id',isAuthenticated, authorizeRoles("admin"), deleteOrder)
router.get("/get-order/:id",isAuthenticated,getOrder);
router.get("/get-orders",isAuthenticated, getAllOrders);



export default router