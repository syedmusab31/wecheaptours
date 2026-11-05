/**
 * Structured data for search engines. "<" is escaped so text from the database can't close the
 * script tag. Data blocks aren't executed, so the CSP nonce isn't needed.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
