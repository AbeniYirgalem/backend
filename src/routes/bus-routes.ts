import { Router } from "express";
import {
  create,
  list,
  getById,
  update,
  remove,
} from "../controllers/bus-controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { roleMiddleware } from "../middleware/role.js";
import { validate } from "../middleware/validate.js";
import { busSchema } from "../validations/bus.js";

const router = Router();

// Create — operator/admin only
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["operator", "admin"]),
  validate(busSchema),
  create,
);

// List — authenticated users; service filters by role
router.get("/", authMiddleware, list);

// Get by ID — authenticated; service validates ownership for operators
router.get("/:id", authMiddleware, getById);

// Update — operator/admin; controller checks ownership
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["operator", "admin"]),
  update,
);

// Delete — operator/admin; controller checks ownership
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["operator", "admin"]),
  remove,
);

export default router;
