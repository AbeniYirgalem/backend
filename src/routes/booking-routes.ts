import { Router } from "express";
import {
  create,
  listUserBookings,
  remove,
} from "../controllers/booking-controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireVerified } from "../middleware/require-verified.js";
import { validate } from "../middleware/validate.js";
import { bookingSchema } from "../validations/booking.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  requireVerified,
  validate(bookingSchema),
  create,
);
router.get("/user", authMiddleware, requireVerified, listUserBookings);
router.delete("/:id", authMiddleware, requireVerified, remove);

export default router;
