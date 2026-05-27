import { Router } from "express";
import { recommendations, options } from "../controllers/routing-controller.js";

const router = Router();

router.get("/recommendations", recommendations);
router.get("/options", options);

export default router;
