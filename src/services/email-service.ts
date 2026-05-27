import { env } from "../config/env.js";
import { mailer, mailerFrom } from "../config/mailer.js";

export async function sendVerificationEmail(payload: {
  to: string;
  name: string;
  token: string;
  expiresAt: Date;
}) {
  const verifyUrl = `${env.appUrl.replace(/\/$/, "")}/auth/verify-email?token=${encodeURIComponent(payload.token)}`;
  const expiryText = payload.expiresAt.toUTCString();

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
      <h2 style="margin:0 0 12px;">Verify your email, ${payload.name}</h2>
      <p style="margin:0 0 16px;">Thanks for creating an account with Bus Ticketing System.</p>
      <p style="margin:0 0 20px;">Click the button below to verify your email address. This link expires on <strong>${expiryText}</strong>.</p>
      <p style="margin:0 0 24px;">
        <a href="${verifyUrl}" style="background:#111827;color:#ffffff;padding:12px 18px;border-radius:999px;text-decoration:none;display:inline-block;">Verify email</a>
      </p>
      <p style="margin:0 0 12px;">If the button does not work, paste this link into your browser:</p>
      <p style="margin:0;word-break:break-all;">${verifyUrl}</p>
    </div>
  `;

  await mailer.sendMail({
    from: mailerFrom,
    to: payload.to,
    subject: "Verify your Bus Ticketing System account",
    html,
    text: `Verify your email by visiting: ${verifyUrl}. This link expires on ${expiryText}.`,
  });
}
