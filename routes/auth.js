import express from "express";
import { register, verifyEmail } from "../controllers/authController.js";
import { validateRequest, registerSchema } from "../middleware/validation.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", validateRequest(registerSchema), register);

// GET /api/auth/verify-email/:token
router.get("/verify-email/:token", verifyEmail);

export default router;
