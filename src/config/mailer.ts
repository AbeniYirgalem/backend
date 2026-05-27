import nodemailer from "nodemailer";
import { env } from "./env.js";

const isGmail = env.smtpHost.toLowerCase().includes("gmail");

export const mailer = env.smtpConfigured
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      service: isGmail ? "gmail" : undefined,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
      connectionTimeout: 10_000,
      socketTimeout: 10_000,
      greetingTimeout: 10_000,
    })
  : nodemailer.createTransport({
      jsonTransport: true,
    });

export const mailerFrom = env.smtpFrom || "no-reply@local";
