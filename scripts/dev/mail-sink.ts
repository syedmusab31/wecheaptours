/**
 * Development mail catcher: an SMTP server on localhost that prints every email instead of sending it.
 *
 *   npm run mail:dev        then set SMTP_HOST=localhost SMTP_PORT=1025 SMTP_USER=dev SMTP_PASSWORD=dev
 *
 * The latest emails are also written to .mail-sink/inbox.json (gitignored), which the smoke tests read
 * to find sign-in codes. Never point production at this.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { SMTPServer } from "smtp-server";

const PORT = Number(process.env.MAIL_SINK_PORT || 1025);
const INBOX = ".mail-sink/inbox.json";
mkdirSync(".mail-sink", { recursive: true });

/** Undoes quoted-printable encoding, then reads the bytes as UTF-8 */
function decode(raw: string): string {
  const joined = raw.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < joined.length; i++) {
    if (joined[i] === "=" && /^[0-9A-F]{2}$/.test(joined.slice(i + 1, i + 3))) {
      bytes.push(parseInt(joined.slice(i + 1, i + 3), 16));
      i += 2;
    } else bytes.push(joined.charCodeAt(i));
  }
  return Buffer.from(bytes).toString("utf8");
}

/** Decodes a header that may be folded over lines and contain RFC 2047 words (=?UTF-8?Q?...?= / ?B?) */
function decodeHeader(value: string): string {
  return value
    .replace(/\r?\n[ \t]+/g, " ")
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/=\?([^?]+)\?([QB])\?([^?]*)\?=/gi, (_, _charset: string, enc: string, data: string) =>
      enc.toUpperCase() === "B"
        ? Buffer.from(data, "base64").toString("utf8")
        : decode(data.replace(/_/g, " ")),
    );
}

const server = new SMTPServer({
  authOptional: true,
  allowInsecureAuth: true,
  disabledCommands: ["STARTTLS"],
  onAuth: (_auth, _session, cb) => cb(null, { user: "dev" }),
  onData(stream, session, cb) {
    let raw = "";
    stream.on("data", (chunk: Buffer) => (raw += chunk.toString("utf8")));
    stream.on("end", () => {
      const text = decode(raw);
      const subject = decodeHeader(/^Subject: (.*(?:\r?\n[ \t].*)*)$/m.exec(raw)?.[1] ?? "(no subject)");
      const to = session.envelope.rcptTo.map((r) => r.address);
      const body = text
        .split(/\r?\n\r?\n/)
        .slice(1)
        .join("\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      console.log(`\n✉  ${to.join(", ")}\n   ${subject}\n   ${body.slice(0, 300)}`);
      let inbox: unknown[] = [];
      try {
        inbox = JSON.parse(readFileSync(INBOX, "utf8"));
      } catch {}
      inbox.unshift({ at: new Date().toISOString(), to, subject, body });
      writeFileSync(INBOX, JSON.stringify(inbox.slice(0, 50), null, 2));
      cb();
    });
  },
});

server.listen(PORT, "127.0.0.1", () => console.log(`Mail catcher on smtp://127.0.0.1:${PORT}`));
