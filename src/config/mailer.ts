import { Resend } from "resend";
import { env } from "./env.js";

/**
 * Resend client – used by the email service to dispatch transactional emails.
 * Falls back to a lightweight stub in development so the app starts even
 * without a RESEND_API_KEY, logging the email payload to the console instead.
 */
export const resend = env.resendApiKey
  ? new Resend(env.resendApiKey)
  : null;

/** Default "from" address for all outgoing emails. */
export const emailFrom =
  env.emailFrom || "Bus Ticketing <onboarding@resend.dev>";
