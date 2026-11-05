import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Cake,
  Gift,
  Heart,
  Pizza,
  ShoppingBag,
  ShoppingBasket,
  Shirt,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { IMG } from "@/features/destination/destination-images";

export const metadata: Metadata = {
  title: "Concierge & events",
  description:
    "Laundry, groceries, food delivery, souvenir shopping, birthdays and private events in Egypt, arranged by our local team.",
};

const CONCIERGE = [
  {
    icon: Shirt,
    title: "Laundry & ironing",
    text: "Pickup from your hotel or apartment, back the same or next day.",
    from: "from $8 per bag",
  },
  {
    icon: ShoppingBasket,
    title: "Groceries & drinks",
    text: "Your fridge stocked before you arrive, or a delivery any day.",
    from: "$5 delivery + shopping cost",
  },
  {
    icon: Pizza,
    title: "Fast food delivery",
    text: "McDonald's, KFC and local favourites to places apps don't reach.",
    from: "$4 delivery + order",
  },
  {
    icon: UtensilsCrossed,
    title: "Fresh dining",
    text: "Seafood, grilled meats and home-cooked Egyptian meals.",
    from: "from $12 per person",
  },
  {
    icon: Cake,
    title: "Egyptian desserts",
    text: "Fresh oriental sweets, baklava and local pastries.",
    from: "from $10 per box",
  },
  {
    icon: ShoppingBag,
    title: "Souvenir shopping",
    text: "Papyrus, Egyptian cotton, gold and silver from shops we trust.",
    from: "Free with any order",
  },
  {
    icon: Sparkles,
    title: "VIP requests",
    text: "Errands, bookings, SIM cards, anything else you need.",
    from: "Quoted per request",
  },
];

const EVENTS = [
  {
    icon: Cake,
    title: "Birthdays",
    text: "Decoration, cake, catering and entertainment at your venue or ours.",
    from: "from $150",
  },
  {
    icon: Heart,
    title: "Anniversaries & Valentine's",
    text: "Private dinners on a Nile boat or facing the pyramids.",
    from: "from $120 for two",
  },
  {
    icon: Gift,
    title: "Private events",
    text: "Gatherings on Nile cruise boats, pyramid-view venues, restaurants and cafés.",
    from: "Quoted per event",
  },
];

export default function ConciergePage() {
  return (
    <>
      <section className="px-2 pt-2 sm:px-3 sm:pt-3">
        <div className="bg-ink relative isolate overflow-hidden rounded-[28px] text-white sm:rounded-[36px]">
          <Image
            src={IMG.cairo[3]}
            alt="A felucca on the Nile in Cairo"
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
          />
          <div className="bg-ink/70 absolute inset-0 -z-10" />
          <div className="mx-auto max-w-[1260px] px-4 py-20 sm:px-8 sm:py-28">
            <h1 className="display max-w-3xl text-4xl sm:text-6xl">Your fixer in Egypt.</h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">
              Tell us what you need and where you are. We send a price on WhatsApp or email, you approve, we
              deliver.
            </p>
            <Link href="/enquire?topic=concierge" className="btn btn-sun mt-8">
              Make a request
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1260px] px-4 pt-16 sm:px-6">
        <h2 className="display-md text-3xl">Concierge services</h2>
        <p className="text-ink-soft mt-2">
          Available in Cairo, Giza, Luxor, Aswan, Hurghada and Sharm El-Sheikh.
        </p>
        <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {CONCIERGE.map((s) => (
            <li key={s.title} className="flex gap-4">
              <span className="bg-lapis-tint text-lapis flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                <s.icon size={22} aria-hidden />
              </span>
              <div>
                <p className="font-bold">{s.title}</p>
                <p className="text-ink-soft mt-0.5">{s.text}</p>
                <p className="tabular mt-1 text-sm font-semibold">{s.from}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-20 max-w-[1260px] px-4 sm:px-8">
        <div className="bg-mist rounded-3xl p-6 sm:p-10">
          <h2 className="display-md text-3xl">Celebrations & events</h2>
          <p className="text-ink-soft mt-2">Planned by our team, down to the cake.</p>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {EVENTS.map((e) => (
              <li key={e.title} className="rounded-2xl bg-white p-6">
                <e.icon size={24} className="text-lapis" aria-hidden />
                <p className="mt-3 text-lg font-bold">{e.title}</p>
                <p className="text-ink-soft mt-1">{e.text}</p>
                <p className="tabular mt-3 text-sm font-semibold">{e.from}</p>
              </li>
            ))}
          </ul>
          <Link href="/enquire?topic=event" className="btn btn-primary mt-8">
            Plan an event
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1260px] px-4 sm:px-8">
        <h2 className="text-xl font-bold">How it works</h2>
        <ol className="mt-4 grid gap-6 sm:grid-cols-3">
          {[
            "Send a request with your location and what you need.",
            "We reply with a fixed price, usually within an hour.",
            "Approve it, and pay cash or card on delivery.",
          ].map((t, i) => (
            <li key={t} className="border-ink border-t-2 pt-3">
              <span className="display-md text-lapis text-2xl">{i + 1}</span>
              <p className="text-ink-soft mt-1">{t}</p>
            </li>
          ))}
        </ol>
        <p className="text-ink-mute mt-6 text-sm">
          Prices shown are starting prices for planning; your quote is final.
        </p>
      </section>
    </>
  );
}
