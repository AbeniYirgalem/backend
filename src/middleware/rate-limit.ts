import rateLimit from "express-rate-limit";

export const resendVerificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many verification requests. Please try again later.",
});
