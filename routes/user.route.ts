import express  from "express";
import { activateUser, addUser, deleteUser, fetchAllUsers, getUserInfo, LoginUser, logoutUser, registrationUser, routeAssign, routeAssignDeletion, socialAuth, updateAccessToken, updatePassword, updateRole, updateUserInfo, verifyUser } from "../controllers/user.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
const router = express.Router();


router.post("/registration", registrationUser);
router.post("/activate-user", activateUser)
router.post("/login", LoginUser);
router.post("/logout", isAuthenticated, logoutUser);
router.get("/refresh", updateAccessToken)
router.get("/me", isAuthenticated, getUserInfo)
router.post("/social-auth", socialAuth)
router.put("/update-user-info", isAuthenticated, updateUserInfo)
router.put("/update-user-password", isAuthenticated, updatePassword)
// router.put("/update-user-avatar", isAuthenticated, updateProfilePicture)
router.get("/get-all-users-admin", isAuthenticated, authorizeRoles('admin'), fetchAllUsers)
router.put("/update-user-role", isAuthenticated, authorizeRoles('admin'), updateRole)
router.delete("/delete-user/:id", isAuthenticated, authorizeRoles('admin'), deleteUser)
router.put("/verify-user/:id", isAuthenticated, authorizeRoles('admin'), verifyUser)
router.put("/assign-route/:id", isAuthenticated, authorizeRoles('admin'), routeAssign)
router.delete("/delete-assigned-route/:id/:index", isAuthenticated, authorizeRoles('admin'), routeAssignDeletion)
router.post("/add-user-admin", isAuthenticated, authorizeRoles('admin'), addUser)

export default router