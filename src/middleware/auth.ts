import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const token = header.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, env.jwtSecret) as {
      id: string;
      role: "passenger" | "operator" | "admin";
    };
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}
