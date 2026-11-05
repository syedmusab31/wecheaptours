/**
 * The booking state machine. Every status change goes through `assertTransition`,
 * so illegal moves (e.g. completed → pending) are rejected before anything is written.
 */
import type { BookingStatus } from "@/server/db/schema";

export const BOOKING_TRANSITIONS = {
  // A guest may withdraw a request before we confirm it, so pending → cancelled is allowed too.
  pending: ["confirmed", "declined", "expired", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show"],
  declined: [],
  expired: [],
  completed: [],
  cancelled: [],
  no_show: [],
} as const satisfies Record<BookingStatus, readonly BookingStatus[]>;

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending: waiting for us to confirm",
  confirmed: "Confirmed",
  declined: "Declined: we can't offer it",
  expired: "Expired: not confirmed in time",
  completed: "Completed: trip done",
  cancelled: "Cancelled",
  no_show: "No-show",
};

/** States that hold seats. Leaving them gives the seats back. */
export const HOLDS_SEATS: readonly BookingStatus[] = ["pending", "confirmed", "completed", "no_show"];

export function nextStatuses(from: BookingStatus): readonly BookingStatus[] {
  return BOOKING_TRANSITIONS[from];
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return (BOOKING_TRANSITIONS[from] as readonly BookingStatus[]).includes(to);
}

export function isFinal(status: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[status].length === 0;
}

export function releasesSeats(from: BookingStatus, to: BookingStatus): boolean {
  return HOLDS_SEATS.includes(from) && !HOLDS_SEATS.includes(to);
}

export class IllegalTransitionError extends Error {
  constructor(
    readonly from: BookingStatus,
    readonly to: BookingStatus,
  ) {
    super(`A ${from} booking can't be changed to ${to}.`);
    this.name = "IllegalTransitionError";
  }
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) throw new IllegalTransitionError(from, to);
}
