/**
 * Building blocks for every email (React Email). Inline styles only: that is what email clients read.
 * Text passed as children or props is escaped by React, so guest input can't inject HTML.
 */
import { Body, Button, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

const INK = "#13213c";
const MUTED = "#5b6884";
const LAPIS = "#2340b0";

export function EmailLayout({
  preview,
  footer,
  children,
}: {
  preview: string;
  footer: string;
  children: ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{ margin: 0, background: "#eef3fa", fontFamily: "Arial, Helvetica, sans-serif", color: INK }}
      >
        <Container
          style={{
            maxWidth: 560,
            margin: "24px auto",
            background: "#ffffff",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <Section
            style={{
              background: LAPIS,
              color: "#ffffff",
              padding: "18px 24px",
              fontSize: 20,
              fontWeight: "bold",
            }}
          >
            wecheaptours
          </Section>
          <Section style={{ padding: 24, fontSize: 15, lineHeight: "1.55" }}>{children}</Section>
          <Section style={{ padding: "16px 24px", background: "#f6f8fc", color: MUTED, fontSize: 12 }}>
            {footer}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function P({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <Text style={{ margin: "0 0 14px", fontSize: 15, lineHeight: "1.55", color: muted ? MUTED : INK }}>
      {children}
    </Text>
  );
}

/** Keeps line breaks the guest typed */
export function Quote({ children }: { children: string }) {
  return <Text style={{ margin: "0 0 14px", color: MUTED, whiteSpace: "pre-line" }}>{children}</Text>;
}

/** Label / value rows. Rows with an empty value are left out. */
export function Details({ rows }: { rows: [label: string, value: string | null | undefined | false][] }) {
  return (
    <table cellPadding={0} cellSpacing={0} style={{ width: "100%", margin: "12px 0" }}>
      <tbody>
        {rows
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <tr key={label}>
              <td style={{ padding: "6px 0", color: MUTED, width: 160, verticalAlign: "top" }}>{label}</td>
              <td style={{ padding: "6px 0", fontWeight: "bold" }}>{value}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

export function Cta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        display: "inline-block",
        background: LAPIS,
        color: "#ffffff",
        padding: "12px 18px",
        borderRadius: 8,
        textDecoration: "none",
        margin: "4px 0 14px",
      }}
    >
      {children}
    </Button>
  );
}

/** A one-time code, large and spaced for reading off a phone */
export function OneTimeCode({ code }: { code: string }) {
  return (
    <Text style={{ fontSize: 30, fontWeight: "bold", letterSpacing: 6, margin: "8px 0 14px" }}>{code}</Text>
  );
}

export function Divider() {
  return <Hr style={{ borderColor: "#e3e8f2", margin: "18px 0" }} />;
}
