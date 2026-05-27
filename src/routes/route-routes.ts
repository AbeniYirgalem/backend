import { Router } from "express";
import { create, list } from "../controllers/route-controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { roleMiddleware } from "../middleware/role.js";
import { validate } from "../middleware/validate.js";
import { routeSchema } from "../validations/route.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware(["operator", "admin"]),
  validate(routeSchema),
  create,
);
router.get("/", list);

export default router;
