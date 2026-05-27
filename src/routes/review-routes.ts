import { Router } from "express";
import { create, listByBus } from "../controllers/review-controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { reviewSchema } from "../validations/review.js";

const router = Router();

router.post("/", authMiddleware, validate(reviewSchema), create);
router.get("/:busId", listByBus);

export default router;
