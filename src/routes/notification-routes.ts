import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireVerified } from "../middleware/require-verified.js";
import {
  listMyNotifications,
  markRead,
  markAllRead,
  getUnreadCount,
} from "../controllers/notification-controller.js";

const router = Router();

router.use(authMiddleware, requireVerified);

router.get("/", listMyNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

export default router;
