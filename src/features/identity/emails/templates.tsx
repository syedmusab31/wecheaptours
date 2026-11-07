import { Cta, EmailLayout, OneTimeCode, P } from "@/server/email/components";

export function LoginCodeEmail({
  name,
  code,
  ip,
  minutes,
  siteUrl,
}: {
  name: string;
  code: string;
  ip: string;
  minutes: number;
  siteUrl: string;
}) {
  return (
    <EmailLayout preview={`Your sign-in code is ${code}`} footer={`Sign-in code · ${siteUrl}`}>
      <P>Hi {name},</P>
      <P>Your sign-in code is</P>
      <OneTimeCode code={code} />
      <P muted>
        It works once, for {minutes} minutes. Requested from IP {ip}.
      </P>
      <P muted>
        Didn&apos;t try to sign in? Someone has your password: change it in Admin → Settings and use
        &quot;Sign out everywhere&quot;.
      </P>
    </EmailLayout>
  );
}

export function FailedLoginAlertEmail({
  account,
  failures,
  settingsUrl,
  siteUrl,
}: {
  account: string;
  failures: number;
  settingsUrl: string;
  siteUrl: string;
}) {
  return (
    <EmailLayout
      preview={`${failures} failed sign-ins for ${account}`}
      footer={`Security alert · ${siteUrl}`}
    >
      <P>
        There were <b>{failures} failed sign-in attempts</b> for the admin account <b>{account}</b> in the
        last hour.
      </P>
      <P>
        Sign-ins are already slowed down and every account needs an emailed code, so nobody got in. If this
        wasn&apos;t a team member, change that account&apos;s password and consider removing it.
      </P>
      <Cta href={settingsUrl}>Open Admin → Settings</Cta>
    </EmailLayout>
  );
}
