import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import {
  loginUser,
  registerUser,
  resendVerificationEmail,
  verifyEmailToken,
} from "../services/auth-service.js";
import { logActivity } from "../services/activity-service.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await registerUser(req.body);

  // Persist: user account creation event
  logActivity(user._id.toString(), "REGISTER", {
    email: user.email,
    role: user.role,
    name: user.name,
  }, req);

  sendResponse(res, 201, "Check your email to verify your account.", {
    id: user._id,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, token } = await loginUser(req.body);

  // Persist: successful login event
  logActivity(user.id, "LOGIN", {
    email: user.email,
    role: user.role,
  }, req);

  sendResponse(res, 200, "Login successful", { token, user });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const token = (req.body?.token || req.query?.token) as string | undefined;
  if (!token) {
    const error = new Error("Verification token is required") as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }
  await verifyEmailToken(token);
  sendResponse(res, 200, "Email verified", { verified: true });
});

export const resendVerification = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await resendVerificationEmail(req.body.email);
    if (result.verified) {
      return sendResponse(res, 200, "Email already verified.", {
        verified: true,
      });
    }
    return sendResponse(res, 200, "Verification email sent.", {
      verified: false,
    });
  },
);
