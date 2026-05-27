import type { Request, Response, NextFunction } from "express";

type KnownError = Error & {
  statusCode?: number;
  code?: number;
  keyValue?: Record<string, unknown>;
};

export function errorHandler(
  err: KnownError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  let status = err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err.code === 11000) {
    status = 409;
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : "field";
    message = `Duplicate ${field}`;
  }

  if (message === "Email already in use" || message === "User already exists") {
    status = 409;
  }

  if (message === "Invalid credentials") {
    status = 401;
  }

  if (
    message === "Your email is not verified. Please verify your email first."
  ) {
    status = 403;
  }

  if (message === "Verification token has expired.") {
    status = 410;
  }

  return res.status(status).json({
    success: false,
    message,
  });
}
