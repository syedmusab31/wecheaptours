import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import {
  BookingAlertEmail,
  BookingReceivedEmail,
  BookingStatusEmail,
} from "@/features/booking/emails/templates";
import { EnquiryAlertEmail } from "@/features/enquiry/emails/templates";
import { LoginCodeEmail } from "@/features/identity/emails/templates";
import type { Booking, Enquiry } from "@/server/db/schema";

const booking = {
  id: 7,
  reference: "WCT-ABC234",
  productTitle: "Pyramids day trip",
  optionName: "Private car",
  category: "tour",
  travelDate: "2026-12-01",
  endDate: null,
  adults: 2,
  children: 0,
  infants: 0,
  tierGuests: [{ key: "senior", label: "Senior (65+)", count: 1 }],
  addons: [{ id: 1, name: "Lunch", quantity: 3, amountCents: 3600 }],
  promoCode: "",
  discountCents: 0,
  totalCents: 15600,
  depositCents: 0,
  paidCents: 0,
  currency: "USD",
  status: "confirmed",
  customerName: "Jane <b>Doe</b>",
  customerEmail: "jane@example.com",
  customerPhone: "+201000000000",
  customerCountry: "UK",
  pickupLocation: "Mena House",
  notes: "<script>alert(1)</script>",
} as unknown as Booking;

describe("email templates", () => {
  it("renders the booking details and escapes guest input", async () => {
    const html = await render(
      <BookingAlertEmail booking={booking} adminUrl="https://x/admin/bookings/7" siteUrl="https://x" />,
    );
    expect(html).toContain("WCT-ABC234");
    expect(html).toContain("2 adults, 1 Senior (65+)");
    expect(html).toContain("$156.00");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("has a plain-text version with the link", async () => {
    const text = await render(
      <BookingReceivedEmail
        booking={booking}
        bookingUrl="https://x/booking/WCT-ABC234?t=abc"
        siteUrl="https://x"
      />,
      {
        plainText: true,
      },
    );
    expect(text).toContain("within 24 hours");
    expect(text).toContain("https://x/booking/WCT-ABC234?t=abc");
  });

  it("shows the pay button only when a payment link is given", async () => {
    const withPay = await render(
      <BookingStatusEmail
        booking={booking}
        bookingUrl="u"
        siteUrl="s"
        pay={{ url: "https://pay", label: "Pay now: US$156.00" }}
      />,
    );
    const without = await render(
      <BookingStatusEmail booking={booking} bookingUrl="u" siteUrl="s" pay={null} />,
    );
    expect(withPay).toContain("https://pay");
    expect(without).not.toContain("https://pay");
    expect(without).toContain("Your booking is confirmed");
  });

  it("renders the sign-in code and the enquiry alert", async () => {
    expect(
      await render(<LoginCodeEmail name="Sam" code="012345" ip="1.2.3.4" minutes={10} siteUrl="s" />),
    ).toContain("012345");
    const enquiry = {
      topic: "event",
      customerName: "Ali",
      customerEmail: "a@b.co",
      customerPhone: "",
      message: "Birthday dinner",
      travelDate: null,
      guests: 8,
      budget: "",
    } as unknown as Enquiry;
    const html = await render(
      <EnquiryAlertEmail enquiry={enquiry} adminUrl="https://x/admin/enquiries" siteUrl="s" />,
    );
    expect(html).toContain("Event or celebration");
    expect(html).toContain("Birthday dinner");
  });
});
