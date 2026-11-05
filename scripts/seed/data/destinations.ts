import { IMG } from "@/features/destination/destination-images";

/** Map positions [latitude, longitude] for the demo destinations */
export const COORDINATES: Record<string, [number, number]> = {
  alexandria: [31.2, 29.92],
  cairo: [30.06, 31.25],
  giza: [29.98, 31.13],
  luxor: [25.69, 32.64],
  aswan: [24.09, 32.9],
  hurghada: [27.26, 33.81],
  "sharm-el-sheikh": [27.91, 34.33],
  "marsa-alam": [25.07, 34.89],
  amman: [31.95, 35.93],
  petra: [30.33, 35.44],
  "wadi-rum": [29.57, 35.42],
  "dead-sea": [31.5, 35.58],
};

export const DESTINATIONS = [
  {
    slug: "giza",
    name: "Giza",
    country: "Egypt" as const,
    tagline: "The last standing wonder of the ancient world",
    description:
      "Home to the Great Pyramid, the Sphinx and the Grand Egyptian Museum, Giza sits 30 minutes from downtown Cairo. Go early: the plateau opens at 8:00 and is quietest in the first two hours.",
    image: IMG.giza[0],
  },
  {
    slug: "cairo",
    name: "Cairo",
    country: "Egypt" as const,
    tagline: "Mosques, markets and 5,000 years of museums",
    description:
      "Africa's largest city packs Islamic Cairo, Coptic churches, the Khan el-Khalili bazaar and evening feluccas on the Nile into one loud, generous capital.",
    image: IMG.cairo[0],
  },
  {
    slug: "alexandria",
    name: "Alexandria",
    country: "Egypt" as const,
    tagline: "Egypt's Mediterranean city",
    description:
      "Seafront corniche, the Citadel of Qaitbay, Roman catacombs and the new Bibliotheca. An easy day trip from Cairo, or a cooler stop in summer.",
    image: IMG.alexandria[0],
  },
  {
    slug: "luxor",
    name: "Luxor",
    country: "Egypt" as const,
    tagline: "The world's greatest open-air museum",
    description:
      "Karnak and Luxor temples on the East Bank; the Valley of the Kings, Hatshepsut's temple and the Colossi of Memnon on the West. Most Nile cruises start or end here.",
    image: IMG.luxor[0],
  },
  {
    slug: "aswan",
    name: "Aswan",
    country: "Egypt" as const,
    tagline: "Granite islands, Nubian villages and Abu Simbel",
    description:
      "Egypt's slowest, sunniest city. Sail a felucca between islands, visit Philae Temple and leave before dawn for the sun temples of Abu Simbel.",
    image: IMG.aswan[0],
  },
  {
    slug: "hurghada",
    name: "Hurghada",
    country: "Egypt" as const,
    tagline: "Red Sea reefs, islands and desert safaris",
    description:
      "Boat trips to Giftun Island, easy snorkelling from the beach and quad-bike safaris into the Eastern Desert. Direct flights from most of Europe.",
    image: IMG.hurghada[0],
  },
  {
    slug: "sharm-el-sheikh",
    name: "Sharm El-Sheikh",
    country: "Egypt" as const,
    tagline: "Ras Mohammed and the Sinai coast",
    description:
      "World-class reefs inside Ras Mohammed National Park, Bedouin dinners in the Sinai mountains and calm, clear water all year.",
    image: IMG.sharm[0],
  },
  {
    slug: "marsa-alam",
    name: "Marsa Alam",
    country: "Egypt" as const,
    tagline: "Dolphins, turtles and quiet bays",
    description:
      "The southern Red Sea: swim with spinner dolphins at Sataya Reef and green turtles in Abu Dabbab bay, far from the crowds.",
    image: IMG.marsa[0],
  },
  {
    slug: "amman",
    name: "Amman",
    country: "Jordan" as const,
    tagline: "Jordan's hill-top capital and Roman Jerash",
    description:
      "The Citadel, the Roman Theatre and rooftop cafés in Amman, with the colonnaded city of Jerash 50 minutes north.",
    image: IMG.amman[0],
  },
  {
    slug: "petra",
    name: "Petra",
    country: "Jordan" as const,
    tagline: "The Rose City carved into sandstone",
    description:
      "Walk the Siq to the Treasury, climb 800 steps to the Monastery and come back after dark for Petra by Night. Allow a full day, or two if you can.",
    image: IMG.petra[0],
  },
  {
    slug: "wadi-rum",
    name: "Wadi Rum",
    country: "Jordan" as const,
    tagline: "Red sand, Bedouin camps and starry nights",
    description:
      "Jeep tours between sandstone towers, sunset from a dune and a night in a Bedouin camp or a bubble tent under one of the darkest skies in the region.",
    image: IMG.wadirum[0],
  },
  {
    slug: "dead-sea",
    name: "Dead Sea",
    country: "Jordan" as const,
    tagline: "Float at the lowest point on Earth",
    description:
      "430 m below sea level. Float in water ten times saltier than the ocean, cover yourself in mineral mud and watch the sun set over the West Bank hills.",
    image: IMG.deadsea[0],
  },
];
