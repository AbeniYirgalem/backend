import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireVerified } from "../middleware/require-verified.js";
import { roleMiddleware } from "../middleware/role.js";
import {
  getMyCard,
  getBalance,
  getHistory,
  rechargeMyCard,
  scanCard,
  getStats,
} from "../controllers/rfid-controller.js";

const router = Router();

router.use(authMiddleware, requireVerified);

// ── Passenger-only endpoints ──
// Only passengers can view/recharge their own wallet
router.get("/card", roleMiddleware(["passenger"]), getMyCard);
router.get("/balance", roleMiddleware(["passenger"]), getBalance);
router.get("/history", roleMiddleware(["passenger"]), getHistory);
router.post("/recharge", roleMiddleware(["passenger"]), rechargeMyCard);

// ── Operator-only endpoints ──
// Operators can scan cards and view system-wide analytics
router.post("/scan", roleMiddleware(["operator", "admin"]), scanCard);
router.get("/stats", roleMiddleware(["operator", "admin"]), getStats);

export default router;
