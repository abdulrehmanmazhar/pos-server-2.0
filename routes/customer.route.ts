import express  from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { addCustomer, deleteCustomer, editCustomer, getCustomer, getCustomerById, returnUdhar } from "../controllers/customer.controller";
const router = express.Router();

router.post('/add-customer',isAuthenticated, addCustomer)
router.put('/edit-customer/:id',isAuthenticated, editCustomer)
router.get('/get-customers',isAuthenticated, getCustomer)
router.get('/get-customer/:id',isAuthenticated, getCustomerById)
router.delete('/delete-customer/:id',isAuthenticated,authorizeRoles("admin"),deleteCustomer)
router.put(`/returnUdhar/:id`,isAuthenticated, returnUdhar)


export default router