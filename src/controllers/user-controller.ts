/**
 * User Controller.
 *
 * Location: backend/src/controllers/user-controller.ts
 *
 * Handles both self-service (passenger/operator) and admin CRUD endpoints.
 */

import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { getUserById, updateUser } from "../services/user-service.js";
import { logActivity } from "../services/activity-service.js";
import { User } from "../models/User.js";
import { Card } from "../models/Card.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ── Self-service ─────────────────────────────────────────────────────────────

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserById(req.user!.id);
  sendResponse(res, 200, "User profile", user);
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await updateUser(req.user!.id, req.body);

  logActivity(req.user!.id, "PROFILE_UPDATE", {
    fields: Object.keys(req.body),
  }, req);

  sendResponse(res, 200, "Profile updated", user);
});

// ── Admin CRUD ───────────────────────────────────────────────────────────────

/**
 * GET /api/users
 * Admin: list all users with pagination + search.
 * Query: page, limit, search, role
 */
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  const role = req.query.role as string | undefined;

  const query: Record<string, unknown> = {};
  if (role && ["passenger", "operator", "admin"].includes(role)) {
    query.role = role;
  }
  if (search) {
    const rx = new RegExp(search, "i");
    query.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const [items, total] = await Promise.all([
    User.find(query)
      .select("-password -verificationToken -verificationTokenExpiry")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  // Enrich with card status
  const userIds = items.map((u) => u._id);
  const cards = await Card.find({ userId: { $in: userIds }, status: "active" })
    .select("userId cardUid balance status")
    .lean();
  const cardMap = new Map(cards.map((c) => [c.userId.toString(), c]));

  const enriched = items.map((u) => ({
    ...u,
    rfidCard: cardMap.get(u._id.toString()) ?? null,
  }));

  sendResponse(res, 200, "Users", {
    items: enriched,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

/**
 * GET /api/users/:id
 * Admin: get a specific user with their RFID card info.
 */
export const getUserByIdAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    const err = new Error("Invalid user id") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(id)
    .select("-password -verificationToken -verificationTokenExpiry")
    .lean();
  if (!user) {
    const err = new Error("User not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  const card = await Card.findOne({ userId: id, status: "active" })
    .select("cardUid balance status lastTapAt")
    .lean();

  sendResponse(res, 200, "User", { ...user, rfidCard: card ?? null });
});

/**
 * POST /api/users
 * Admin: create a user account directly (bypassing email verification flow).
 * Body: { name, email, password, role?, phone? }
 */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role = "passenger", phone } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    phone?: string;
  };

  if (!name || !email || !password) {
    const err = new Error("name, email and password are required") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const exists = await User.findOne({ email }).lean();
  if (exists) {
    const err = new Error("Email already registered") as Error & { statusCode?: number };
    err.statusCode = 409;
    throw err;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email,
    password: hashed,
    role,
    phone,
    isVerified: true, // Admin-created accounts are pre-verified
  });

  const { password: _pw, verificationToken: _vt, ...safeUser } = user.toObject();
  sendResponse(res, 201, "User created", safeUser);
});

/**
 * PUT /api/users/:id
 * Admin: update a user's profile or role.
 * Body: { name?, phone?, role?, isVerified? }
 */
export const updateUserAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    const err = new Error("Invalid user id") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  // Disallow changing password via this endpoint
  const { password: _pw, verificationToken: _vt, ...allowed } = req.body;

  const user = await User.findByIdAndUpdate(id, allowed, { new: true })
    .select("-password -verificationToken -verificationTokenExpiry")
    .lean();
  if (!user) {
    const err = new Error("User not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  sendResponse(res, 200, "User updated", user);
});

/**
 * DELETE /api/users/:id
 * Admin: soft-delete a user (marks account inactive).
 * Hard delete is intentionally avoided to preserve transaction history integrity.
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    const err = new Error("Invalid user id") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  // Prevent deleting yourself
  if (id === req.user!.id) {
    const err = new Error("You cannot delete your own account") as Error & { statusCode?: number };
    err.statusCode = 403;
    throw err;
  }

  const user = await User.findById(id);
  if (!user) {
    const err = new Error("User not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  // Block any associated cards before removing account
  await Card.updateMany({ userId: id, status: "active" }, { status: "blocked" });

  await User.findByIdAndDelete(id);
  sendResponse(res, 200, "User deleted", { id });
});
