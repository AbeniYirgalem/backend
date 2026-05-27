import { env } from "../config/env.js";
import { resend, emailFrom } from "../config/mailer.js";

// ── Reusable HTML wrapper ──────────────────────────────────────────────────────
function wrapHtml(body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:32px;font-family:Arial,Helvetica,sans-serif;background:#f8fafc;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    ${body}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px;" />
    <p style="margin:0;font-size:12px;color:#94a3b8;">Bus Ticketing System &bull; This is an automated message.</p>
  </div>
</body>
</html>`.trim();
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;">${label}</a>`;
}

// ── Send helper (logs in dev when Resend is not configured) ────────────────────
async function send(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!resend) {
    // eslint-disable-next-line no-console
    console.log(
      `[email-service] Resend not configured – email to ${options.to} logged:\n`,
      { subject: options.subject, text: options.text ?? "(html only)" },
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: emailFrom,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

// ── Public email functions ─────────────────────────────────────────────────────

export async function sendVerificationEmail(payload: {
  to: string;
  name: string;
  token: string;
  expiresAt: Date;
}) {
  const verifyUrl = `${env.appUrl.replace(/\/$/, "")}/auth/verify-email?token=${encodeURIComponent(payload.token)}`;
  const expiryText = payload.expiresAt.toUTCString();

  const html = wrapHtml(`
    <h2 style="margin:0 0 12px;">Verify your email, ${payload.name}</h2>
    <p style="margin:0 0 16px;">Thanks for creating an account with Bus Ticketing System.</p>
    <p style="margin:0 0 20px;">Click the button below to verify your email address. This link expires on <strong>${expiryText}</strong>.</p>
    <p style="margin:0 0 24px;">${ctaButton(verifyUrl, "Verify email")}</p>
    <p style="margin:0 0 12px;">If the button does not work, paste this link into your browser:</p>
    <p style="margin:0;word-break:break-all;font-size:13px;color:#475569;">${verifyUrl}</p>
  `);

  await send({
    to: payload.to,
    subject: "Verify your Bus Ticketing System account",
    html,
    text: `Verify your email by visiting: ${verifyUrl}. This link expires on ${expiryText}.`,
  });
}

export async function sendPasswordResetEmail(payload: {
  to: string;
  name: string;
  resetUrl: string;
  expiresAt: Date;
}) {
  const expiryText = payload.expiresAt.toUTCString();

  const html = wrapHtml(`
    <h2 style="margin:0 0 12px;">Reset your password, ${payload.name}</h2>
    <p style="margin:0 0 16px;">We received a request to reset your password.</p>
    <p style="margin:0 0 20px;">Click the button below to set a new password. This link expires on <strong>${expiryText}</strong>.</p>
    <p style="margin:0 0 24px;">${ctaButton(payload.resetUrl, "Reset password")}</p>
    <p style="margin:0 0 12px;">If you did not request this, you can safely ignore this email.</p>
    <p style="margin:0;word-break:break-all;font-size:13px;color:#475569;">${payload.resetUrl}</p>
  `);

  await send({
    to: payload.to,
    subject: "Reset your Bus Ticketing System password",
    html,
    text: `Reset your password by visiting: ${payload.resetUrl}. This link expires on ${expiryText}.`,
  });
}

export async function sendWelcomeEmail(payload: {
  to: string;
  name: string;
}) {
  const dashboardUrl = `${env.appUrl.replace(/\/$/, "")}/dashboard`;

  const html = wrapHtml(`
    <h2 style="margin:0 0 12px;">Welcome aboard, ${payload.name}! 🎉</h2>
    <p style="margin:0 0 16px;">Your email has been verified and your account is ready to use.</p>
    <p style="margin:0 0 24px;">${ctaButton(dashboardUrl, "Go to Dashboard")}</p>
    <p style="margin:0;">Happy travels!</p>
  `);

  await send({
    to: payload.to,
    subject: "Welcome to Bus Ticketing System!",
    html,
    text: `Welcome to Bus Ticketing System, ${payload.name}! Visit your dashboard: ${dashboardUrl}`,
  });
}
