import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireVerified } from "../middleware/require-verified.js";
import { etaPrediction, queueStatus } from "../controllers/metrics-controller.js";

const router = Router();

router.get("/queue", authMiddleware, requireVerified, queueStatus);
router.get("/eta", authMiddleware, requireVerified, etaPrediction);

export default router;
