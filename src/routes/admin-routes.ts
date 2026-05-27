import { Router } from "express";
import { approveOperatorHandler, users } from "../controllers/admin-controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { roleMiddleware } from "../middleware/role.js";

const router = Router();

router.get("/users", authMiddleware, roleMiddleware(["admin"]), users);
router.put(
  "/approve-operator",
  authMiddleware,
  roleMiddleware(["admin"]),
  approveOperatorHandler,
);

export default router;
