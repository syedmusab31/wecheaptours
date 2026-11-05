/** Brand wording in one place. Country names are not here: they come from the countries table. */
export const SITE = {
  name: "WeCheapTours",
  /** Used when no country is active yet (fresh database) */
  fallbackRegion: "Egypt and Jordan",
  tagline: (region: string) =>
    `Day trips, Nile cruises, transfers and stays across ${region}, run by a local team.`,
  description: (region: string) =>
    `Book day trips, Nile cruises, private transfers and vacation rentals across ${region}. Clear prices, free cancellation and local support on WhatsApp.`,
};
