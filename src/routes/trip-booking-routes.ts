import { Router } from "express";
import {
  book,
  listMine,
  cancel,
  getOne,
  getLiveTracking,
} from "../controllers/trip-booking-controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireVerified } from "../middleware/require-verified.js";

const router = Router();

router.post("/", authMiddleware, requireVerified, book);
router.get("/mine", authMiddleware, requireVerified, listMine);
router.get("/:id/live", authMiddleware, requireVerified, getLiveTracking);
router.get("/:id", authMiddleware, requireVerified, getOne);
router.patch("/:id/cancel", authMiddleware, requireVerified, cancel);

export default router;
