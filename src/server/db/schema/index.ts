export * from "./catalog";
export * from "./availability";
export * from "./customers";
export * from "./booking";
export * from "./engagement";
export * from "./identity";
export * from "./settings";
export * from "./system";

import type { availabilitySlots } from "./availability";
import type {
  bookingEvents,
  bookingStatusEnum,
  bookings,
  paymentKindEnum,
  paymentStatusEnum,
  payments,
} from "./booking";
import type {
  addonUnitEnum,
  categoryEnum,
  countries,
  destinations,
  priceRules,
  priceUnitEnum,
  productAddons,
  productOptions,
  products,
  promoCodes,
} from "./catalog";
import type { customers } from "./customers";
import type { enquiries, enquiryStatusEnum, reviews } from "./engagement";
import type { adminRoleEnum, adminUsers, loginChallenges } from "./identity";
import type { jobs } from "./system";

export type Country = typeof countries.$inferSelect;
export type Destination = typeof destinations.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductOption = typeof productOptions.$inferSelect;
export type PriceRule = typeof priceRules.$inferSelect;
export type ProductAddon = typeof productAddons.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
export type AvailabilitySlot = typeof availabilitySlots.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingEvent = typeof bookingEvents.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Enquiry = typeof enquiries.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Category = (typeof categoryEnum.enumValues)[number];
export type PriceUnit = (typeof priceUnitEnum.enumValues)[number];
export type AddonUnit = (typeof addonUnitEnum.enumValues)[number];
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type PaymentKind = (typeof paymentKindEnum.enumValues)[number];
export type EnquiryStatus = (typeof enquiryStatusEnum.enumValues)[number];
export type AdminRole = (typeof adminRoleEnum.enumValues)[number];
export type AdminUser = typeof adminUsers.$inferSelect;
export type LoginChallenge = typeof loginChallenges.$inferSelect;
