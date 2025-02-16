import express  from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { createTarget, getAllTargets, getTargetsByUser, updateTargetProgress } from "../controllers/target.controller";
const router = express.Router();
router.post('/create-target/:id',isAuthenticated, authorizeRoles("admin"),createTarget);
router.get('/gell-all-targets', isAuthenticated, getAllTargets);
router.get('/get-user-target/:id', isAuthenticated, getTargetsByUser);
router.put('/update-target-progress/:id', isAuthenticated, updateTargetProgress);
export default router