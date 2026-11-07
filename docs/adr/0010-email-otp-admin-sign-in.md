# 0010. Admin two-step sign-in with an emailed code

- Status: Accepted
- Date: 2026-11

## Context

Admin accounts can see every guest's contact details and issue refunds. A stolen or reused password alone must not
be enough. Authenticator apps are the stronger second factor, but the team found them a hurdle; everyone already
has a work mailbox.

## Decision

After a correct password, a 6-digit code is emailed (`identity/server/otp.ts`, `auth.service.ts`):

- Only an HMAC of the code is stored (`login_challenges`). It expires after 10 minutes and allows 5 attempts.
- The challenge is bound to the browser by a short-lived signed cookie.
- Sign-in, code checks and resends are rate limited per IP and per account.
- Repeated failures email the account owner an alert.
- "Trust this device for 30 days" sets a signed cookie that skips the code on that browser.
- Sessions carry a `sessionVersion`; bumping it (password change, "sign out everywhere") ends every session.

## Consequences

- A leaked password isn't enough without access to the mailbox.
- The mailbox becomes the key: staff mailboxes need their own two-factor protection.
- Sign-in depends on email delivery; `npm run admin:recover` resets access from the server if SMTP is down.
- An authenticator-app (TOTP) or passkey option can be added later as another challenge type.
