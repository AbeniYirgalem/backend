import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { getUserById, updateUser } from "../services/user-service.js";
import { logActivity } from "../services/activity-service.js";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserById(req.user!.id);
  sendResponse(res, 200, "User profile", user);
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await updateUser(req.user!.id, req.body);

  // Persist: profile change event
  logActivity(req.user!.id, "PROFILE_UPDATE", {
    fields: Object.keys(req.body),
  }, req);

  sendResponse(res, 200, "Profile updated", user);
});
