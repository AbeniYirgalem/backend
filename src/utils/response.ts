import type { Response } from "express";

export function sendResponse(
  res: Response,
  status: number,
  message: string,
  data?: unknown,
) {
  return res.status(status).json({
    success: status < 400,
    message,
    data,
  });
}
