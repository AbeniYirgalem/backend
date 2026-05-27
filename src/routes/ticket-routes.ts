import { Router } from "express";
import { getByBooking } from "../controllers/ticket-controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireVerified } from "../middleware/require-verified.js";

const router = Router();

router.get("/:bookingId", authMiddleware, requireVerified, getByBooking);

export default router;
