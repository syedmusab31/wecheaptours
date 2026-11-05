import type { Metadata } from "next";
import { CATEGORIES, CATEGORY_META } from "@/features/catalog/catalog.constants";
import { CHILD_RULES, RULES, cancellationText, paymentText } from "@/features/booking/domain/booking-policy";

export const metadata: Metadata = { title: "Booking terms & cancellation policy" };

export default function BookingTermsPage() {
  const h2 = "mt-12 text-2xl font-bold scroll-mt-24";
  return (
    <article className="mx-auto max-w-3xl px-4 pt-10 pb-10 sm:px-6">
      <h1 className="display-md text-3xl sm:text-4xl">Booking terms</h1>
      <p className="text-ink-soft mt-3 text-lg">
        The standard rules for every booking on WeCheapTours, in plain words.
      </p>

      <h2 className={h2}>How a booking works</h2>
      <div className="prose-plain text-ink-soft mt-3 leading-relaxed">
        <p>
          When you send a booking request, nothing is charged. We check availability with our guides, boats
          and hosts and confirm by email within 24 hours. Your booking is only final once you receive our
          confirmation.
        </p>
        <p>
          Prices are in US dollars and include everything listed under "Included" on each page. Entrance fees
          are shown separately when they are not included, so you know the full cost before you book.
        </p>
      </div>

      <h2 className={h2}>Notice, payment and deposits</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-ink border-b-2">
              <th className="py-2 pr-4">Booking type</th>
              <th className="py-2 pr-4">Minimum notice</th>
              <th className="py-2">Payment</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c) => (
              <tr key={c} className="border-line border-b align-top">
                <td className="py-3 pr-4 font-semibold">{CATEGORY_META[c].plural}</td>
                <td className="tabular py-3 pr-4">
                  {RULES[c].leadHours >= 48
                    ? `${RULES[c].leadHours / 24} days`
                    : `${RULES[c].leadHours} hours`}
                </td>
                <td className="text-ink-soft py-3">{paymentText(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-ink-mute mt-3 text-sm">
        We accept cash (USD, EUR, EGP, JOD), cards and bank transfer. Card payments may carry a 3% fee from
        the card provider.
      </p>

      <h2 id="cancellation" className={h2}>
        Cancellation policy
      </h2>
      <ul className="mt-4 space-y-3">
        {CATEGORIES.map((c) => (
          <li key={c} className="border-line rounded-xl border p-4">
            <p className="font-semibold">{CATEGORY_META[c].plural}</p>
            <p className="text-ink-soft mt-1">{cancellationText(c)}</p>
          </li>
        ))}
      </ul>
      <div className="prose-plain text-ink-soft mt-4 leading-relaxed">
        <p>
          To cancel, reply to your confirmation email or message us on WhatsApp with your booking reference.
          Refunds go back to the original payment method within 7 working days.
        </p>
        <p>
          If we cancel because of weather, safety or a closure by the authorities, you choose a new date or a
          full refund.
        </p>
      </div>

      <h2 className={h2}>Children</h2>
      <p className="text-ink-soft mt-3 leading-relaxed">
        On trips priced per person, children aged 0–{CHILD_RULES.infantMaxAge} travel free without their own
        seat or meal, and children aged {CHILD_RULES.infantMaxAge + 1}–{CHILD_RULES.childMaxAge} pay{" "}
        {CHILD_RULES.childShare * 100}% of the adult price. Child seats in cars are free on request.
      </p>

      <h2 className={h2}>On the day</h2>
      <ul className="text-ink-soft mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>Be ready in your hotel lobby at the pickup time we send. Drivers wait up to 15 minutes.</li>
        <li>If you miss the pickup without telling us, the trip counts as a no-show and is not refunded.</li>
        <li>Bring your passport for Abu Simbel, Sinai and all trips to Jordan.</li>
        <li>Itineraries can change order because of traffic, weather or site opening times.</li>
      </ul>

      <h2 className={h2}>Changes</h2>
      <p className="text-ink-soft mt-3 leading-relaxed">
        Date or guest changes are free inside the free-cancellation window, subject to availability. After
        that we do our best, but the cancellation terms apply.
      </p>
    </article>
  );
}
