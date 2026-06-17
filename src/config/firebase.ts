/**
 * Firebase Admin SDK initialization.
 *
 * Location: backend/src/config/firebase.ts
 *
 * Uses the modern firebase-admin v11+ modular import pattern.
 * Initializes the Admin SDK once (singleton) and exports a reference
 * to the Realtime Database. Must only run server-side.
 *
 * Required environment variables:
 *   FIREBASE_PROJECT_ID      – Firebase project ID
 *   FIREBASE_DATABASE_URL    – Realtime Database URL
 *   FIREBASE_CLIENT_EMAIL    – Service account email
 *   FIREBASE_PRIVATE_KEY     – Service account private key (escaped \n handled automatically)
 */

import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getDatabase as getAdminDatabase } from "firebase-admin/database";
import type { Database } from "firebase-admin/database";
import { env } from "./env.js";

let database: Database | null = null;

function initFirebase(): Database | null {
  const { firebaseProjectId, firebaseDatabaseUrl, firebaseClientEmail, firebasePrivateKey } = env;

  if (!firebaseProjectId || !firebaseDatabaseUrl) {
    console.warn(
      "[Firebase] FIREBASE_PROJECT_ID or FIREBASE_DATABASE_URL is not set — Firebase features will be disabled.",
    );
    return null;
  }

  // Re-use existing app if already initialized (handles hot-reloads in dev)
  const existingApp = getApps().find((a) => a.name === "[DEFAULT]");
  if (existingApp) {
    return getAdminDatabase(existingApp);
  }

  const credential =
    firebaseClientEmail && firebasePrivateKey
      ? cert({
          projectId: firebaseProjectId,
          clientEmail: firebaseClientEmail,
          privateKey: firebasePrivateKey,
        })
      : undefined; // Falls back to Application Default Credentials (ADC)

  const app = initializeApp(
    {
      credential,
      databaseURL: firebaseDatabaseUrl,
    },
    "[DEFAULT]",
  );

  console.log("[Firebase] Admin SDK initialized successfully.");
  return getAdminDatabase(app);
}

database = initFirebase();

/**
 * Firebase Realtime Database reference.
 * Will be null if Firebase credentials are not configured.
 */
export { database };

/**
 * Helper to get a database reference with a runtime null-check.
 * Throws a descriptive error if Firebase is not configured.
 */
export function getDatabase(): Database {
  if (!database) {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_DATABASE_URL, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your .env file.",
    );
  }
  return database;
}
