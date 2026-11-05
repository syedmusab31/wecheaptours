import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "@/server/logger";
import { siteUrl } from "@/lib/routes";
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
 * Sends an email. Throws when the SMTP server refuses it, so the job that sent it is retried.
 * Without SMTP_HOST (development), the email is written to the log instead.
 */
export async function sendMail(to: string, subject: string, html: string, replyTo?: string) {
  if (!to) return;
  const t = getTransporter();
  if (!t) {
    logger.info(
      {
        event: "email.dev",
        subject,
        text: html
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 500),
      },
      "email (not sent: SMTP_HOST is not set)",
    );
    return;
  }
  await t.sendMail({ from: FROM(), to, subject, html: layout(subject, html), replyTo });
  logger.info({ event: "email.sent", subject }, "email sent");
}

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#eef3fa;font-family:Arial,Helvetica,sans-serif;color:#13213c">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#2340b0;color:#fff;padding:18px 24px;font-size:20px;font-weight:bold">wecheaptours</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55">${body}</td></tr>
<tr><td style="padding:16px 24px;background:#f6f8fc;color:#5b6884;font-size:12px">${esc(title)} · ${esc(siteUrl())}</td></tr>
</table></td></tr></table></body></html>`;
}

/** A label/value row for email tables (both escaped) */
export function row(label: string, value: string) {
  return `<tr><td style="padding:6px 0;color:#5b6884;width:150px">${esc(label)}</td><td style="padding:6px 0"><b>${esc(value)}</b></td></tr>`;
}

/** A call-to-action button for emails */
export function button(href: string, label: string) {
  return `<p><a href="${esc(href)}" style="display:inline-block;background:#2340b0;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">${esc(label)}</a></p>`;
}
