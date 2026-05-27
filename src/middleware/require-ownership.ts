import type { Request, Response, NextFunction } from "express";
import { Bus } from "../models/Bus.js";

/**
 * Generic ownership middleware factory.
 * Verifies the authenticated user owns the requested resource.
 *
 * Usage:
 *   requireOwnership("Bus", "operatorId")       → checks Bus.operatorId === req.user.id
 *   requireOwnership("Booking", "userId")        → checks Booking.userId === req.user.id
 */
export function requireOwnership(
  modelName: string,
  ownerField: string,
  paramKey: string = "id",
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      // Admin bypasses ownership checks
      if (req.user.role === "admin") {
        return next();
      }

      const resourceId = req.params[paramKey];
      if (!resourceId) {
        return res.status(400).json({ success: false, message: "Resource ID required" });
      }

      // Dynamic model lookup
      const mongoose = await import("mongoose");
      const Model = mongoose.default.models[modelName];
      if (!Model) {
        return res.status(500).json({ success: false, message: "Invalid model" });
      }

      const resource = await Model.findById(resourceId).lean();
      if (!resource) {
        return res.status(404).json({ success: false, message: `${modelName} not found` });
      }

      const ownerId = (resource as Record<string, unknown>)[ownerField];
      if (!ownerId || ownerId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You do not own this resource.",
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
