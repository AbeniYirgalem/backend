import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireVerified } from "../middleware/require-verified.js";
import { validate } from "../middleware/validate.js";
import {
  register,
  recharge,
  tap,
  getById,
} from "../controllers/card-controller.js";
import {
  registerCardSchema,
  rechargeCardSchema,
  tapCardSchema,
} from "../validations/card.js";

const router = Router();

router.post(
  "/register",
  authMiddleware,
  requireVerified,
  validate(registerCardSchema),
  register,
);
router.post(
  "/recharge",
  authMiddleware,
  requireVerified,
  validate(rechargeCardSchema),
  recharge,
);
router.post(
  "/tap",
  authMiddleware,
  requireVerified,
  validate(tapCardSchema),
  tap,
);
router.get("/:id", authMiddleware, requireVerified, getById);

export default router;
