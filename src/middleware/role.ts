import type { Request, Response, NextFunction } from "express";

export function roleMiddleware(
  roles: Array<"passenger" | "operator" | "admin">,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    return next();
  };
}
