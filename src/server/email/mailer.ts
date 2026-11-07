import "server-only";
import { render } from "@react-email/render";
import nodemailer, { type Transporter } from "nodemailer";
import type { ReactElement } from "react";
import { logger } from "@/server/logger";
import { env } from "@/config/env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    const port = env.SMTP_PORT;
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

const FROM = () => env.EMAIL_FROM;
export const notifyAddress = () => env.NOTIFY_EMAIL || env.ADMIN_EMAIL || "";

/**
 * Sends a React Email template (HTML plus a plain-text version). Throws when the SMTP server refuses
 * it, so the job that sent it is retried. Without SMTP_HOST (development), it is written to the log.
 */
export async function sendEmail(msg: { to: string; subject: string; react: ReactElement; replyTo?: string }) {
  if (!msg.to) return;
  const [html, text] = await Promise.all([render(msg.react), render(msg.react, { plainText: true })]);
  const t = getTransporter();
  if (!t) {
    // Env validation requires SMTP in production; never write email bodies (sign-in codes) to production logs
    if (env.NODE_ENV === "production") throw new Error("SMTP is not configured");
    logger.info(
      { event: "email.dev", subject: msg.subject, text: text.replace(/\s+/g, " ").trim().slice(0, 500) },
      "email (not sent: SMTP_HOST is not set)",
    );
    return;
  }
  await t.sendMail({ from: FROM(), to: msg.to, subject: msg.subject, html, text, replyTo: msg.replyTo });
  logger.info({ event: "email.sent", subject: msg.subject }, "email sent");
}
