import { Router } from "express";
import { getMe, updateMe } from "../controllers/user-controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/me", authMiddleware, getMe);
router.put("/update", authMiddleware, updateMe);

export default router;
