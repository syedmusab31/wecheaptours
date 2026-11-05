import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-10 pt-10 leading-relaxed text-ink-soft sm:px-6">
      <h1 className="display-md text-3xl text-ink sm:text-4xl">Privacy</h1>
      <div className="prose-plain mt-6">
        <p>
          We collect the details you give us when you book or contact us: your name, email, phone number, country,
          pickup address and any notes. We use them only to arrange your trip, contact you about it and, if you
          subscribe, to send our deals email.
        </p>
        <p>
          We share your name, phone and pickup location with the guide, driver, boat or host running your booking, and
          nobody else. We don't sell your data.
        </p>
        <p>
          We keep booking records for as long as tax law requires. To see, correct or delete your data, email us and
          we'll reply within 30 days.
        </p>
        <p>
          The site uses one cookie to remember your chosen currency, and staff sign-in cookies for the admin area. No
          advertising cookies.
        </p>
      </div>
    </article>
  );
}
