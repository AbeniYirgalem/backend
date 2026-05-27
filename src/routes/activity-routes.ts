import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireVerified } from "../middleware/require-verified.js";
import { getMyActivity } from "../controllers/activity-controller.js";

const router = Router();

router.use(authMiddleware, requireVerified);
router.get("/", getMyActivity);

export default router;
