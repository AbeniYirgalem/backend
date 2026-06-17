/**
 * ESP32 API Key middleware.
 *
 * Location: backend/src/middleware/esp32-auth.ts
 *
 * ESP32 hardware devices cannot perform JWT-based OAuth flows.
 * This middleware authenticates IoT requests using a static API key
 * transmitted in the X-ESP32-Key request header.
 *
 * Usage:
 *   router.post("/esp32-scan", esp32AuthMiddleware, scanCardEsp32);
 *
 * Configuration:
 *   Set ESP32_API_KEY in your .env file to any strong random string.
 *   Programme the same key into your ESP32 firmware.
 *
 * Security notes:
 *   - Use HTTPS in production so the key is never sent in plaintext.
 *   - Rotate the key by updating both the .env and the firmware.
 *   - For higher security, consider per-device keys or mTLS certificates.
 */

import type { Request, Response, NextFunction } from "express";

const ESP32_KEY = process.env.ESP32_API_KEY || "";

export function esp32AuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!ESP32_KEY) {
    // If no key is configured, reject all requests in production;
    // allow in development with a console warning so developers can
    // test without setting up the key first.
    if (process.env.NODE_ENV === "production") {
      res.status(503).json({
        success: false,
        message: "ESP32 API key is not configured on the server.",
      });
      return;
    }
    console.warn(
      "[esp32-auth] ESP32_API_KEY is not set — requests are not authenticated (dev mode).",
    );
    next();
    return;
  }

  const key = req.headers["x-esp32-key"];
  if (!key || key !== ESP32_KEY) {
    res.status(401).json({
      success: false,
      message: "Invalid or missing ESP32 API key.",
    });
    return;
  }

  next();
}
