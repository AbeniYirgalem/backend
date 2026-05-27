import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireVerified } from "../middleware/require-verified.js";
import { roleMiddleware } from "../middleware/role.js";
import {
  availability,
  congestion,
  createNotification,
  eta,
  faultAnalytics,
  faults,
  monitorFaults,
  notifications,
  overview,
  passengerFlow,
  queue,
  routes,
  seed,
  solutions,
  vehicles,
} from "../controllers/intelligence-controller.js";

const router = Router();

router.use(authMiddleware, requireVerified);

// Public intelligence data (any authenticated user)
router.get("/queue", queue);
router.get("/eta", eta);
router.get("/availability", availability);
router.get("/routes", routes);

// Monitoring data — operator & admin only
router.get("/overview", roleMiddleware(["operator", "admin"]), overview);
router.get("/congestion", roleMiddleware(["operator", "admin"]), congestion);
router.get("/vehicles", roleMiddleware(["operator", "admin"]), vehicles);
router.get("/faults", roleMiddleware(["operator", "admin"]), faults);
router.post("/faults/monitor", roleMiddleware(["operator", "admin"]), monitorFaults);
router.get("/faults/analytics", roleMiddleware(["operator", "admin"]), faultAnalytics);
router.get("/solutions", roleMiddleware(["operator", "admin"]), solutions);
router.get("/passenger-flow", roleMiddleware(["operator", "admin"]), passengerFlow);
router.get("/notifications", notifications);
router.post("/notifications", roleMiddleware(["operator", "admin"]), createNotification);
router.post("/seed", roleMiddleware(["admin"]), seed);

export default router;
