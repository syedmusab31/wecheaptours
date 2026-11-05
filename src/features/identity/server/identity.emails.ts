import "server-only";
import { siteUrl } from "@/lib/routes";
import { esc, sendMail } from "@/server/email/mailer";
import { OTP_TTL_MINUTES } from "./otp";

export async function sendLoginCode(to: string, name: string, code: string, ip: string) {
  await sendMail(
    to,
    `${code} is your WeCheapTours sign-in code`,
    `<p>Hi ${esc(name)},</p>
<p>Your sign-in code is</p>
<p style="font-size:30px;font-weight:bold;letter-spacing:6px;margin:8px 0">${esc(code)}</p>
<p style="color:#5b6884">It works once, for ${OTP_TTL_MINUTES} minutes. Requested from IP ${esc(ip)}.</p>
<p style="color:#5b6884">Didn't try to sign in? Someone has your password: change it in Admin → Settings and use "Sign out everywhere".</p>`,
  );
}

export async function sendFailedLoginAlert(to: string[], account: string, failures: number) {
  for (const address of to) {
    await sendMail(
      address,
      `Security alert: ${failures} failed sign-ins for ${account}`,
      `<p>There were <b>${failures} failed sign-in attempts</b> for the admin account <b>${esc(account)}</b> in the last hour.</p>
<p>Sign-ins are already slowed down and every account needs an emailed code, so nobody got in. If this wasn't a team member,
change that account's password and consider removing it in <a href="${siteUrl("/admin/settings")}">Admin → Settings</a>.</p>`,
    );
  }
}
