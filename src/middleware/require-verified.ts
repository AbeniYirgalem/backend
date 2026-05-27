import type { Request, Response, NextFunction } from "express";
import { User } from "../models/User.js";

export async function requireVerified(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(req.user.id).select("isVerified").lean();

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before booking tickets.",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
