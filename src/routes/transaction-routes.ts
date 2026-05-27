import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireVerified } from "../middleware/require-verified.js";
import { list } from "../controllers/transaction-controller.js";

const router = Router();

router.get("/", authMiddleware, requireVerified, list);

export default router;
