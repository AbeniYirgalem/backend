import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const clientUrl =
  process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:3000";
const frontendUrl = process.env.FRONTEND_URL || clientUrl;
const appUrl = process.env.APP_URL || clientUrl;
const allowedOriginsRaw = process.env.ALLOWED_ORIGINS || "";
const allowedOrigins = new Set<string>([
  "http://localhost:3000",
  "https://frontend-seven-beta-42.vercel.app",
  clientUrl,
  frontendUrl,
  appUrl,
  ...allowedOriginsRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
]);

const brevoApiKey = process.env.BREVO_API_KEY || "";
const emailFrom =
  process.env.EMAIL_FROM || "Bus Ticketing <no-reply@bus-ticketing.local>";

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 5000),
  mongodbUri: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  verificationTokenExpiresIn: process.env.VERIFICATION_TOKEN_EXPIRES_IN || "1h",
  appUrl,
  frontendUrl,
  clientUrl,
  allowedOriginsRaw,
  allowedOrigins: Array.from(allowedOrigins).filter(Boolean),
  brevoApiKey,
  emailFrom,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  // Firebase Admin SDK
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
  firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL || "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
  // Firebase private key: replace escaped \n with real newlines
  firebasePrivateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
};

if (!env.mongodbUri) {
  throw new Error("MONGO_URI (or MONGODB_URI) is required");
}
if (!env.jwtSecret) {
  throw new Error("JWT_SECRET is required");
}
if (env.nodeEnv === "production") {
  if (env.clientUrl.includes("localhost") || env.appUrl.includes("localhost")) {
    throw new Error(
      "CLIENT_URL and APP_URL must be non-localhost in production",
    );
  }
  if (!env.brevoApiKey) {
    throw new Error("BREVO_API_KEY is required in production");
  }
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is required in production");
  }
}
