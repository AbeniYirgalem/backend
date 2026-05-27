import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { performance } from "perf_hooks";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { Card } from "../models/Card.js";
import { sendVerificationEmail } from "./email-service.js";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "passenger" | "operator" | "admin";
  phone?: string;
  isVerified: boolean;
};

function toAuthUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: "passenger" | "operator" | "admin";
  phone?: string;
  isVerified: boolean;
}): AuthUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    isVerified: user.isVerified,
  };
}

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function createVerificationToken(payload: { id: string; email: string }) {
  const token = jwt.sign(payload, env.jwtSecret as Secret, {
    expiresIn: env.verificationTokenExpiresIn as SignOptions["expiresIn"],
  });
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) {
    throw new Error("Failed to generate verification token");
  }
  const expiresAt = new Date(decoded.exp * 1000);
  return { token, expiresAt };
}

/** Generate a unique RFID card UID in format RFID-XXXXXX */
function generateCardUid(): string {
  const hex = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `RFID-${hex}`;
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  role?: "passenger" | "operator" | "admin";
  phone?: string;
}) {
  const startTime = performance.now();

  const existingStart = performance.now();
  const existing = await User.findOne({ email: payload.email }).lean();
  const existingMs = performance.now() - existingStart;
  if (existing) {
    throw new Error("User already exists");
  }

  const hashStart = performance.now();
  const hashed = await bcrypt.hash(payload.password, 10);
  const hashMs = performance.now() - hashStart;

  const createUserStart = performance.now();
  const user = await User.create({
    name: payload.name,
    email: payload.email,
    password: hashed,
    role: payload.role || "passenger",
    phone: payload.phone,
    isVerified: false,
  });
  const createUserMs = performance.now() - createUserStart;

  // ── Auto-generate RFID card for passengers ──
  const role = payload.role || "passenger";
  if (role === "passenger") {
    const cardStart = performance.now();
    let cardUid = generateCardUid();
    // Ensure uniqueness
    let attempts = 0;
    while (await Card.findOne({ cardUid }).lean()) {
      cardUid = generateCardUid();
      attempts++;
      if (attempts > 10) break;
    }
    await Card.create({
      userId: user._id,
      cardUid,
      balance: 0,
      status: "active",
    });
    const cardMs = performance.now() - cardStart;
    // eslint-disable-next-line no-console
    console.log(
      `[auth-service] Registration timing | step=card_create | ${cardMs.toFixed(1)}ms`,
    );
  }

  const tokenStart = performance.now();
  const { token, expiresAt } = createVerificationToken({
    id: user._id.toString(),
    email: user.email,
  });
  const hashedToken = await bcrypt.hash(token, 10);
  user.verificationToken = hashedToken;
  user.verificationTokenExpiry = expiresAt;
  await user.save();
  const tokenMs = performance.now() - tokenStart;

  if (!user.email) {
    throw createHttpError(
      "User email is missing; cannot send verification email.",
      400,
    );
  }

  const tokenPreview = `${token.slice(0, 12)}...${token.slice(-6)}`;
  // eslint-disable-next-line no-console
  console.log(
    `[auth-service] Sending verification email to ${user.email} | token: ${tokenPreview}`,
  );

  const emailStart = performance.now();
  void sendVerificationEmail({
    to: user.email,
    name: user.name,
    token,
    expiresAt,
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error("[auth-service] Failed to send verification email", error);
  });
  const emailMs = performance.now() - emailStart;

  const totalMs = performance.now() - startTime;
  // eslint-disable-next-line no-console
  console.log(
    `[auth-service] Registration timing | lookup=${existingMs.toFixed(1)}ms | hash=${hashMs.toFixed(1)}ms | create=${createUserMs.toFixed(1)}ms | token=${tokenMs.toFixed(1)}ms | email_trigger=${emailMs.toFixed(1)}ms | total=${totalMs.toFixed(1)}ms`,
  );

  return user;
}

export async function loginUser(payload: { email: string; password: string }) {
  const user = await User.findOne({ email: payload.email });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const match = await bcrypt.compare(payload.password, user.password);
  if (!match) {
    throw new Error("Invalid credentials");
  }

  if (!user.isVerified) {
    throw createHttpError(
      "Your email is not verified. Please verify your email first.",
      403,
    );
  }

  const token = jwt.sign(
    { id: user._id.toString(), role: user.role },
    env.jwtSecret as Secret,
    { expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] },
  );

  return { user: toAuthUser(user), token };
}

export async function verifyEmailToken(token: string) {
  let payload: { id: string; email: string };
  try {
    payload = jwt.verify(token, env.jwtSecret) as {
      id: string;
      email: string;
    };
  } catch {
    throw createHttpError("Verification token is invalid or expired.", 400);
  }

  const user = await User.findById(payload.id);
  if (!user) {
    throw createHttpError("Verification token is invalid.", 400);
  }

  if (user.isVerified) {
    return { verified: true };
  }

  if (!user.verificationToken || !user.verificationTokenExpiry) {
    throw createHttpError("Verification token is invalid.", 400);
  }

  if (user.verificationTokenExpiry.getTime() < Date.now()) {
    throw createHttpError("Verification token has expired.", 410);
  }

  const tokenMatch = await bcrypt.compare(token, user.verificationToken);
  if (!tokenMatch) {
    throw createHttpError("Verification token is invalid.", 400);
  }

  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpiry = null;
  await user.save();

  return { verified: true };
}

export async function resendVerificationEmail(email: string) {
  const user = await User.findOne({ email });
  if (!user) {
    return { sent: false, verified: false };
  }

  if (user.isVerified) {
    return { sent: false, verified: true };
  }

  const { token, expiresAt } = createVerificationToken({
    id: user._id.toString(),
    email: user.email,
  });
  const hashedToken = await bcrypt.hash(token, 10);
  user.verificationToken = hashedToken;
  user.verificationTokenExpiry = expiresAt;
  await user.save();

  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    token,
    expiresAt,
  });

  return { sent: true, verified: false };
}
