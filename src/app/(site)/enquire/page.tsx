import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { EnquiryForm } from "@/features/enquiry/components/EnquiryForm";
import { getProductTitle } from "@/features/catalog/server/catalog.service";
import { getSettings } from "@/features/settings/server/settings.service";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Ask a question, plan a custom trip or request concierge help in Egypt and Jordan.",
};

const MESSAGES: Record<string, string> = {
  package: "We'd like a trip of about … days, visiting …",
  concierge: "We're staying at … and would like …",
  event: "We're celebrating … and would like …",
};

export default async function EnquirePage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; product?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const { contact } = await getSettings();
  let product: { id: number; title: string } | undefined;
  if (sp.product && /^\d+$/.test(sp.product)) {
    product = (await getProductTitle(Number(sp.product))) ?? undefined;
  }
  const topic = product ? "product" : (sp.topic ?? "general");

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="display-md text-3xl sm:text-4xl">Talk to our team</h1>
        <p className="text-ink-soft mt-2 max-w-xl text-lg">
          Questions, custom trips, concierge and events. A real person replies within 24 hours, usually the
          same day.
        </p>
        <div className="mt-8 max-w-2xl">
          <EnquiryForm
            topic={topic}
            productId={product?.id}
            productTitle={product?.title}
            defaultMessage={sp.message ?? MESSAGES[topic] ?? ""}
          />
        </div>
      </div>
      <aside className="space-y-5 lg:pt-20">
        <p className="font-bold">Faster on WhatsApp</p>
        <ul className="text-ink-soft space-y-3">
          {contact.whatsapp && (
            <li>
              <a
                href={`https://wa.me/${contact.whatsapp}`}
                target="_blank"
                rel="noopener"
                className="text-faience inline-flex items-center gap-2 font-semibold hover:underline"
              >
                <MessageCircle size={18} aria-hidden /> Message us on WhatsApp
              </a>
            </li>
          )}
          {contact.phone && (
            <li className="inline-flex items-center gap-2">
              <Phone size={18} aria-hidden /> {contact.phone}
            </li>
          )}
          {contact.email && (
            <li>
              <a href={`mailto:${contact.email}`} className="hover:text-ink inline-flex items-center gap-2">
                <Mail size={18} aria-hidden /> {contact.email}
              </a>
            </li>
          )}
        </ul>
        <p className="text-ink-mute text-sm">Open every day, 8:00 to 23:00 Cairo time.</p>
      </aside>
    </div>
  );
}
