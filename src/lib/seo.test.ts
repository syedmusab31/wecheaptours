import { describe, expect, it } from "vitest";
import { breadcrumbList, graph, productGraph } from "./seo";

const base = {
  title: "Valley of the Kings day trip",
  summary: "Tombs and temples",
  images: ["https://images.unsplash.com/photo-1"],
  url: "/tours/valley-of-the-kings",
  priceCents: 4500,
  currency: "USD",
  rating: 4.8,
  reviewCount: 12,
  destinationName: "Luxor",
  country: "Egypt",
  itinerary: [{ title: "Valley of the Kings" }, { title: "Hatshepsut temple" }],
  isTrip: true,
};

describe("structured data", () => {
  it("numbers breadcrumbs from 1 with absolute URLs", () => {
    const b = breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Day trips", path: "/tours" },
    ]);
    expect(b.itemListElement).toEqual([
      expect.objectContaining({
        position: 1,
        name: "Home",
        item: expect.stringMatching(/^https?:\/\/.+\/$/),
      }),
      expect.objectContaining({ position: 2, item: expect.stringMatching(/\/tours$/) }),
    ]);
  });

  it("describes a trip as Product + TouristTrip with price and rating", () => {
    const [product, trip] = productGraph(base);
    expect(product).toMatchObject({
      "@type": "Product",
      offers: { price: "45.00", priceCurrency: "USD" },
      aggregateRating: { ratingValue: 4.8, reviewCount: 12 },
    });
    expect(trip).toMatchObject({
      "@type": "TouristTrip",
      itinerary: { itemListElement: [{ position: 1 }, { position: 2 }] },
    });
  });

  it("leaves out the rating with no reviews, and TouristTrip for stays", () => {
    const nodes = productGraph({ ...base, reviewCount: 0, isTrip: false });
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).not.toHaveProperty("aggregateRating");
    expect(graph(nodes)).toMatchObject({
      "@context": "https://schema.org",
      "@graph": [{ "@type": "Product" }],
    });
  });
});
