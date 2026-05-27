import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        data: result.error.flatten(),
      });
    }
    req.query = result.data as Request["query"];
    return next();
  };
}
