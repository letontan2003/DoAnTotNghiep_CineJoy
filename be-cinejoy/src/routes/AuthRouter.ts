import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  getAccount,
  forgotPassword,
  verifyOtp,
  resetPassword,
  verifyCurrentPassword,
} from "../controllers/AuthController";
import { verifyToken } from "../middlewares/AuthMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refreshToken", refreshToken);
router.post("/logout", verifyToken, logout);
router.get("/account", verifyToken, getAccount);
router.post("/forgotPassword", forgotPassword);
router.post("/verifyOtp", verifyOtp);
router.post("/resetPassword", resetPassword);
router.post("/verify-password", verifyToken, verifyCurrentPassword);

export default router;
