import nodemailer from "nodemailer";
import { env } from "./env.js";

/**
 * SMTP transport for Brevo (Sendinblue). Falls back to null when credentials
 * are missing so the app can still boot in development.
 */
export const smtpTransporter =
  env.brevoUser && env.brevoPass
    ? nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false,
        auth: {
          user: env.brevoUser,
          pass: env.brevoPass,
        },
      })
    : null;

/** Default "from" address for all outgoing emails. */
export const emailFrom = env.emailFrom;
