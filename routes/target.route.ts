import express  from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { createTarget, deleteTarget, getAllTargets, getTargetsByUser, updateTargetProgress } from "../controllers/target.controller";
const router = express.Router();
router.post('/create-target/:id',isAuthenticated, authorizeRoles("admin"),createTarget);
router.get('/gell-all-targets', isAuthenticated, getAllTargets);
router.get('/get-user-target/:id', isAuthenticated, getTargetsByUser);
router.put('/update-target-progress/:id', isAuthenticated, updateTargetProgress);
router.delete('/delete-target/:id', isAuthenticated, deleteTarget);
export default router