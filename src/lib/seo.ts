/**
 * schema.org structured data (JSON-LD) for search engines. Pure builders; render with <JsonLd>.
 * https://developers.google.com/search/docs/appearance/structured-data
 */
import { SITE } from "@/config/site";
import { siteUrl } from "@/lib/routes";

type Thing = Record<string, unknown>;

export function breadcrumbList(items: { name: string; path: string }[]): Thing {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: siteUrl(item.path),
    })),
  };
}

export function organization(contact: { email?: string; phone?: string; address?: string }): Thing {
  return {
    "@type": "TravelAgency",
    "@id": siteUrl("/#organization"),
    name: SITE.name,
    url: siteUrl("/"),
    logo: siteUrl("/icon.svg"),
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(contact.address ? { address: contact.address } : {}),
  };
}

/** Lets Google show a search box for the site in results */
export function website(): Thing {
  return {
    "@type": "WebSite",
    "@id": siteUrl("/#website"),
    url: siteUrl("/"),
    name: SITE.name,
    publisher: { "@id": siteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: siteUrl("/search?q={search_term_string}") },
      "query-input": "required name=search_term_string",
    },
  };
}

export type ProductForSeo = {
  title: string;
  summary: string;
  images: string[];
  url: string;
  priceCents: number;
  currency: string;
  rating: number;
  reviewCount: number;
  destinationName: string | null;
  country: string | null;
  itinerary: { title: string }[];
  isTrip: boolean;
};

/** Product (price and star rating in results) and, for tours, cruises and packages, TouristTrip */
export function productGraph(p: ProductForSeo): Thing[] {
  const url = siteUrl(p.url);
  const offer = {
    "@type": "Offer",
    url,
    priceCurrency: p.currency,
    price: (p.priceCents / 100).toFixed(2),
    availability: "https://schema.org/InStock",
    seller: { "@id": siteUrl("/#organization") },
  };
  const product: Thing = {
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.title,
    description: p.summary,
    image: p.images,
    url,
    brand: { "@type": "Brand", name: SITE.name },
    offers: offer,
    ...(p.reviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.rating,
            reviewCount: p.reviewCount,
            bestRating: 5,
          },
        }
      : {}),
  };
  if (!p.isTrip) return [product];
  const trip: Thing = {
    "@type": "TouristTrip",
    "@id": `${url}#trip`,
    name: p.title,
    description: p.summary,
    image: p.images[0],
    url,
    provider: { "@id": siteUrl("/#organization") },
    offers: offer,
    ...(p.destinationName
      ? {
          touristType: "Sightseeing",
          itinerary: {
            "@type": "ItemList",
            itemListElement: (p.itinerary.length ? p.itinerary.map((s) => s.title) : [p.destinationName]).map(
              (name, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item: { "@type": "TouristAttraction", name },
              }),
            ),
          },
        }
      : {}),
  };
  return [product, trip];
}

/** Wraps nodes in one @graph document */
export function graph(...nodes: (Thing | Thing[])[]): Thing {
  return { "@context": "https://schema.org", "@graph": nodes.flat() };
}
