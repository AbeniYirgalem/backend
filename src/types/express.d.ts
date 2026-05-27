import "express";

declare global {
  namespace Express {
    interface User {
      id: string;
      role: "passenger" | "operator" | "admin";
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
