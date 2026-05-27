import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { roleMiddleware } from "../middleware/role.js";
import { operatorOverview } from "../controllers/operator-controller.js";

const router = Router();

router.get(
  "/overview",
  authMiddleware,
  roleMiddleware(["operator"]),
  operatorOverview,
);

export default router;
