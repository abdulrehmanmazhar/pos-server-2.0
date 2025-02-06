import express  from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { createTransaction, deleteTransaction, getTodayTransactions, getTransactions } from "../controllers/transaction.controller";
const router = express.Router();

router.post('/create-transaction',isAuthenticated,  createTransaction)
router.delete('/delete-transaction/:id',isAuthenticated,authorizeRoles("admin"),  deleteTransaction)
router.get('/get-transactions',isAuthenticated, getTransactions)
router.get('/get-today-transactions',isAuthenticated, getTodayTransactions)


export default router
