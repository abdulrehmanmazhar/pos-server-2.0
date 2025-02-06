import express  from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { getProductSales } from "../controllers/productSale.controller";
const router = express.Router();

router.post('/get-product-sales',isAuthenticated, getProductSales)
export default router