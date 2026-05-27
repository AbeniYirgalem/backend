import { Router } from "express";
import { create, list, search } from "../controllers/schedule-controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { roleMiddleware } from "../middleware/role.js";
import { validate } from "../middleware/validate.js";
import { validateQuery } from "../middleware/validate-query.js";
import { scheduleSchema, scheduleSearchSchema } from "../validations/schedule.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware(["operator", "admin"]),
  validate(scheduleSchema),
  create,
);
router.get("/", list);
router.get("/search", validateQuery(scheduleSearchSchema), search);

export default router;
