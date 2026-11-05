import "server-only";
import { CACHE_TAGS, cached } from "@/server/cache";
import { SITE } from "@/config/site";
import { joinList } from "@/lib/text";
import { isForeignKeyViolation, isUniqueViolation } from "@/server/db/errors";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import type { CountryFormInput, DestinationFormInput } from "../destination.schema";
import * as destinationRepository from "./destination.repository";

export async function saveDestination({ id, ...values }: DestinationFormInput) {
  try {
    if (id) {
      const updated = await destinationRepository.updateDestination(id, values);
      if (!updated) throw new NotFoundError("Destination not found");
      return updated;
    }
    return await destinationRepository.insertDestination(values);
  } catch (err) {
    if (isUniqueViolation(err, "destinations_slug_unique")) {
      throw new ConflictError("Another destination already uses this slug.");
    }
    if (isForeignKeyViolation(err)) throw new ValidationError("Choose a country from the list.");
    throw err;
  }
}

export async function saveCountry(input: CountryFormInput) {
  return destinationRepository.upsertCountry(input);
}

export type { DestinationView } from "./destination.repository";

const tags = [CACHE_TAGS.destinations, CACHE_TAGS.products];
export const getDestinations = cached(destinationRepository.getDestinations, "destinations:active", { tags });
export const getDestinationBySlug = cached(
  destinationRepository.getDestinationBySlug,
  "destinations:by-slug",
  { tags },
);
const fromPrices = cached(
  async () => [...(await destinationRepository.getDestinationFromPrices()).entries()],
  "destinations:from-prices",
  { tags },
);
const activeCountryNames = cached(
  async () => (await destinationRepository.listCountries({ activeOnly: true })).map((c) => c.name),
  "countries:active-names",
  { tags },
);

/** "Egypt and Jordan" (or "Egypt & Jordan", "Egypt or Jordan"), built from the active countries */
export async function getRegionLabel(conjunction: "and" | "or" | "&" = "and"): Promise<string> {
  const names = await activeCountryNames();
  return names.length ? joinList(names, conjunction) : SITE.fallbackRegion;
}

/** Lowest price and product count per destination id */
export async function getDestinationFromPrices() {
  return new Map(await fromPrices());
}

export {
  listCountries,
  getDestinationById,
  listAll as listAllDestinations,
  listWithProductCounts as listDestinationsWithCounts,
  listForSitemap as listDestinationsForSitemap,
} from "./destination.repository";
