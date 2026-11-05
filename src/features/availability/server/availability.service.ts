import "server-only";
import { addDays, nightsBetween } from "@/lib/dates";
import type { Transaction } from "@/server/db/transaction";
import { ValidationError } from "@/server/errors";
import * as slotsRepository from "./availability.repository";

const MAX_GENERATE_DAYS = 400;

export type DayAvailability = { date: string; status: "open" | "full" | "closed"; seatsLeft: number };

/**
 * Takes `seats` on every date the booking occupies, inside the booking's transaction.
 * Products without any slots are sold "on request" and are not checked.
 * Two guests can't take the last seat: the slot rows are locked until the transaction ends.
 */
export async function reserveSeats(
  tx: Transaction,
  input: { productId: number; dates: string[]; seats: number; startTime?: string | null },
): Promise<{ slotId: number; seats: number }[]> {
  if (!(await slotsRepository.productHasSlots(input.productId, tx))) return [];
  const slots = await slotsRepository.lockSlots(input.productId, input.dates, input.startTime ?? null, tx);
  const reservations: { slotId: number; seats: number }[] = [];
  for (const date of input.dates) {
    // With several departures on a day, take the first one that still has room
    const slot = slots.find(
      (s) => s.startsOn === date && s.status === "open" && s.capacity - s.reserved >= input.seats,
    );
    if (!slot) {
      const any = slots.some((s) => s.startsOn === date && s.status === "open");
      throw new ValidationError(
        any ? `Sold out on ${date}. Pick another date.` : `Not available on ${date}. Pick another date.`,
      );
    }
    await slotsRepository.addReserved(slot.id, input.seats, tx);
    slot.reserved += input.seats;
    reservations.push({ slotId: slot.id, seats: input.seats });
  }
  return reservations;
}

export async function saveReservations(
  tx: Transaction,
  bookingId: number,
  rows: { slotId: number; seats: number }[],
) {
  await slotsRepository.insertReservations(
    rows.map((r) => ({ ...r, bookingId })),
    tx,
  );
}

/** Gives a booking's seats back (cancel, decline, expire) */
export async function releaseSeats(tx: Transaction, bookingId: number) {
  const released = await slotsRepository.takeReservations(bookingId, tx);
  for (const r of released) await slotsRepository.addReserved(r.slotId, -r.seats, tx);
  return released.length;
}

/** Day-by-day availability for the public calendar. `onRequest` = no slots, every date can be requested. */
export async function getAvailability(productId: number, from: string, to: string, seats = 1) {
  const slots = await slotsRepository.listSlots(productId, from, to);
  if (!slots.length && !(await slotsRepository.productHasSlots(productId)))
    return { onRequest: true, days: [] };
  const byDate = new Map<string, DayAvailability>();
  for (const s of slots) {
    const left = s.status === "open" ? Math.max(0, s.capacity - s.reserved) : 0;
    const prev = byDate.get(s.startsOn);
    const seatsLeft = Math.max(prev?.seatsLeft ?? 0, left);
    byDate.set(s.startsOn, {
      date: s.startsOn,
      seatsLeft,
      status:
        seatsLeft >= seats ? "open" : prev?.status === "open" || s.status === "open" ? "full" : "closed",
    });
  }
  return { onRequest: false, days: [...byDate.values()] };
}

/** Admin: create slots on the chosen weekdays between two dates ("copy a weekly pattern forward") */
export async function generateSlots(input: {
  productId: number;
  from: string;
  to: string;
  capacity: number;
  startTime: string;
  weekdays: number[];
}) {
  const days = nightsBetween(input.from, input.to) + 1;
  if (days > MAX_GENERATE_DAYS)
    throw new ValidationError(`Generate at most ${MAX_GENERATE_DAYS} days at a time.`);
  const rows = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(input.from, i);
    const [y, m, d] = date.split("-").map(Number);
    if (!input.weekdays.includes(new Date(Date.UTC(y, m - 1, d)).getUTCDay())) continue;
    rows.push({
      productId: input.productId,
      startsOn: date,
      startTime: input.startTime,
      capacity: input.capacity,
      status: "open" as const,
    });
  }
  return slotsRepository.upsertSlots(rows);
}

export { setDayStatus, deleteEmptySlots, listSlots } from "./availability.repository";
