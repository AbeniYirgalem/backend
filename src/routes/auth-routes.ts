import { Router } from "express";
import {
  login,
  register,
  resendVerification,
  testEmail,
  verifyEmail,
} from "../controllers/auth-controller.js";
import { resendVerificationLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import {
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  testEmailSchema,
  verifyEmailSchema,
} from "../validations/auth.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.get("/verify-email", verifyEmail);
router.post(
  "/resend-verification",
  resendVerificationLimiter,
  validate(resendVerificationSchema),
  resendVerification,
);
router.post("/test-email", validate(testEmailSchema), testEmail);

export default router;
