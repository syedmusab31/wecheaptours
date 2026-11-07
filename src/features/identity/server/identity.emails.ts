import "server-only";
import { createElement } from "react";
import { siteUrl } from "@/lib/routes";
import { sendEmail } from "@/server/email/mailer";
import { FailedLoginAlertEmail, LoginCodeEmail } from "../emails/templates";
import { OTP_TTL_MINUTES } from "./otp";

export async function sendLoginCode(to: string, name: string, code: string, ip: string) {
  await sendEmail({
    to,
    subject: `${code} is your WeCheapTours sign-in code`,
    react: createElement(LoginCodeEmail, { name, code, ip, minutes: OTP_TTL_MINUTES, siteUrl: siteUrl() }),
  });
}

export async function sendFailedLoginAlert(to: string[], account: string, failures: number) {
  for (const address of to) {
    await sendEmail({
      to: address,
      subject: `Security alert: ${failures} failed sign-ins for ${account}`,
      react: createElement(FailedLoginAlertEmail, {
        account,
        failures,
        settingsUrl: siteUrl("/admin/settings"),
        siteUrl: siteUrl(),
      }),
    });
  }
}
