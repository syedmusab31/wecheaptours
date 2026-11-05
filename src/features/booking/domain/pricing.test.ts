import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, nightsBetween } from "@/lib/dates";
import {
  cancellationFeeCents,
  cancellationText,
  canCancelFree,
  earliestDate,
  latestDate,
} from "./booking-policy";
import { quote, seatsNeeded, type QuoteInput } from "./pricing";

const NOW = new Date(2026, 5, 1, 10, 0, 0); // Mon 1 Jun 2026, 10:00 local

const tour = (over: Partial<QuoteInput> = {}): QuoteInput => ({
  category: "tour",
  priceUnit: "person",
  priceCents: 4000,
  minGuests: 1,
  maxGuests: 12,
  minNights: 1,
  travelDate: "2026-06-10",
  adults: 2,
  children: 0,
  infants: 0,
  ...over,
});

const ok = (input: QuoteInput) => {
  const q = quote(input, NOW);
  if (!q.ok) throw new Error(q.error);
  return q;
};

beforeEach(() => vi.useFakeTimers().setSystemTime(NOW));
afterEach(() => vi.useRealTimers());

describe("quote: per-person pricing", () => {
  it("charges adults full price", () => {
    expect(ok(tour())).toMatchObject({
      totalCents: 8000,
      units: 2,
      depositCents: 0,
      seats: 2,
      dates: ["2026-06-10"],
    });
  });

  it("charges children half price and infants nothing", () => {
    const q = ok(tour({ adults: 2, children: 1, infants: 1 }));
    expect(q.totalCents).toBe(10000);
    expect(q.lines.map((l) => l.amountCents)).toEqual([8000, 2000, 0]);
    expect(q.seats).toBe(3); // infants sit on a lap
  });

  it("rounds a child's half price half-up to the cent", () => {
    const q = ok(tour({ priceCents: 3333, adults: 1, children: 1 }));
    expect(q.lines[1].amountCents).toBe(1667);
    expect(q.totalCents).toBe(5000);
  });

  it("keeps a whole number of cents for any price", () => {
    for (const priceCents of [1, 99, 3333, 12345]) {
      const q = ok(tour({ priceCents, adults: 3, children: 3 }));
      expect(Number.isInteger(q.totalCents)).toBe(true);
    }
  });

  it("requires at least one adult", () => {
    expect(quote(tour({ adults: 0, children: 2 }), NOW)).toEqual({
      ok: false,
      error: expect.stringMatching(/adult/),
    });
  });

  it("enforces min and max guests", () => {
    expect(quote(tour({ minGuests: 3 }), NOW).ok).toBe(false);
    expect(quote(tour({ maxGuests: 2, adults: 2, infants: 1 }), NOW).ok).toBe(false);
  });
});

describe("quote: dates", () => {
  it("rejects a tour inside the 24 h lead time", () => {
    expect(quote(tour({ travelDate: "2026-06-02" }), NOW).ok).toBe(false);
    expect(quote(tour({ travelDate: "2026-06-03" }), NOW).ok).toBe(true);
  });

  it("accepts the earliest date one day early with graceDays", () => {
    expect(quote(tour({ travelDate: "2026-06-02" }), NOW, { graceDays: 1 }).ok).toBe(true);
  });

  it("rejects dates more than a year ahead and malformed dates", () => {
    expect(quote(tour({ travelDate: "2027-06-03" }), NOW).ok).toBe(false);
    expect(quote(tour({ travelDate: "10/06/2026" }), NOW).ok).toBe(false);
  });

  it("uses a 3-day lead time for cruises", () => {
    expect(earliestDate("cruise", NOW)).toBe("2026-06-05");
    expect(earliestDate("transfer", NOW)).toBe("2026-06-02");
  });
});

describe("quote: nightly stays", () => {
  const stay = (over: Partial<QuoteInput> = {}) =>
    tour({
      category: "stay",
      priceUnit: "night",
      priceCents: 9000,
      minNights: 2,
      endDate: "2026-06-13",
      ...over,
    });

  it("prices by the night, takes a 20% deposit and occupies each night", () => {
    expect(ok(stay())).toMatchObject({
      units: 3,
      totalCents: 27000,
      depositCents: 5400,
      seats: 1,
      dates: ["2026-06-10", "2026-06-11", "2026-06-12"],
    });
  });

  it("needs a check-out after check-in", () => {
    expect(quote(stay({ endDate: null }), NOW).ok).toBe(false);
    expect(quote(stay({ endDate: "2026-06-10" }), NOW).ok).toBe(false);
  });

  it("enforces minimum and maximum nights", () => {
    expect(quote(stay({ endDate: "2026-06-11" }), NOW).ok).toBe(false);
    expect(quote(stay({ endDate: "2026-07-20" }), NOW).ok).toBe(false);
  });

  it("applies a seasonal rule only to the nights it covers", () => {
    const q = ok(
      stay({
        rules: [{ name: "Peak week +50%", startsOn: "2026-06-12", endsOn: "2026-06-30", percentChange: 50 }],
      }),
    );
    expect(q.lines.at(-1)).toEqual({ label: "Peak week +50% (1 night)", amountCents: 4500 });
    expect(q.totalCents).toBe(31500);
  });
});

describe("quote: rules, add-ons and promo codes", () => {
  it("applies weekday and group-size rules to the base price", () => {
    const rules = [
      { name: "Wednesday +10%", weekdays: [3], percentChange: 10 }, // 10 Jun 2026 is a Wednesday
      { name: "Group of 6+ −10%", minGuests: 6, percentChange: -10 },
    ];
    expect(ok(tour({ rules })).totalCents).toBe(8800);
    expect(ok(tour({ rules, adults: 6 })).totalCents).toBe(24000);
  });

  it("ignores rules outside their dates", () => {
    expect(
      ok(tour({ rules: [{ name: "Xmas", startsOn: "2026-12-20", endsOn: "2026-12-31", percentChange: 25 }] }))
        .totalCents,
    ).toBe(8000);
  });

  it("prices add-ons per person or per booking", () => {
    const q = ok(
      tour({
        adults: 2,
        children: 1,
        addons: [
          { id: 1, name: "Lunch", priceCents: 1200, unit: "person" },
          { id: 2, name: "Photo pack", priceCents: 2500, unit: "booking" },
        ],
      }),
    );
    expect(q.totalCents).toBe(10000 + 3600 + 2500);
  });

  it("takes a percentage or a fixed amount off, never below zero", () => {
    expect(ok(tour({ promo: { code: "SPRING10", percentOff: 10 } }))).toMatchObject({
      discountCents: 800,
      totalCents: 7200,
    });
    expect(ok(tour({ promo: { code: "BIG", amountOffCents: 99_999 } }))).toMatchObject({
      discountCents: 8000,
      totalCents: 0,
    });
  });

  it("charges the deposit on the discounted total", () => {
    const q = ok(
      tour({ category: "package", travelDate: "2026-06-20", promo: { code: "P", percentOff: 50 } }),
    );
    expect(q).toMatchObject({ totalCents: 4000, depositCents: 800 });
  });
});

describe("flat prices", () => {
  it("charges a vehicle once regardless of guests and takes one unit of capacity", () => {
    expect(
      ok(tour({ category: "transfer", priceUnit: "vehicle", priceCents: 3500, adults: 4 })),
    ).toMatchObject({
      totalCents: 3500,
      units: 1,
      seats: 1,
    });
  });
  it("counts seats by price unit", () => {
    expect(seatsNeeded("person", 2, 1)).toBe(3);
    expect(seatsNeeded("group", 8, 2)).toBe(1);
  });
});

describe("cancellation", () => {
  it("is free outside the window and charged inside it", () => {
    expect(canCancelFree("tour", "2026-06-10", NOW)).toBe(true);
    expect(cancellationFeeCents("tour", 8000, "2026-06-10", NOW)).toBe(0);
    expect(cancellationFeeCents("tour", 8000, "2026-06-02", NOW)).toBe(8000);
    expect(cancellationFeeCents("cruise", 10000, "2026-06-10", NOW)).toBe(5000); // inside 14 days → 50%
  });
});

describe("date helpers", () => {
  it("adds days across month ends", () => expect(addDays("2026-01-31", 1)).toBe("2026-02-01"));
  it("counts nights", () => expect(nightsBetween("2026-03-28", "2026-04-02")).toBe(5));
  it("caps bookings a year ahead", () => expect(latestDate(NOW)).toBe("2027-06-01"));
  it("describes cancellation in days or hours", () => {
    expect(cancellationText("cruise")).toMatch(/14 days/);
    expect(cancellationText("tour")).toMatch(/24 hours/);
  });
});
