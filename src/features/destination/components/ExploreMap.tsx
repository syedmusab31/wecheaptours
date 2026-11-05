"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COUNTRY_LABELS,
  DEAD_SEA,
  isOnMap,
  EGYPT,
  JORDAN,
  LABEL_SIDE,
  LAKE_NASSER,
  MAP_H,
  MAP_W,
  MEDITERRANEAN,
  NILE,
  NILE_EAST,
  NILE_WEST,
  project,
  RED_SEA,
  SEA_LABELS,
} from "@/features/destination/destination-map";

export type MapPoint = {
  slug: string;
  name: string;
  country: string;
  tagline: string;
  image: string;
  latitude: number | null;
  longitude: number | null;
  count: number;
  fromLabel: string | null;
};

const PAD = 14;

/**
 * Skyscanner-style "explore": every destination on one map with its lowest price.
 * Hover or focus a pin to preview it; the list underneath works the same way for touch and keyboard.
 */
export function ExploreMap({ points, initial = "luxor" }: { points: MapPoint[]; initial?: string }) {
  // Pinned when it has coordinates inside the drawn area; the rest are listed under the map
  const placed = points.filter(
    (p) => p.latitude != null && p.longitude != null && isOnMap(p.latitude, p.longitude),
  );
  const unplaced = points.filter((p) => !placed.includes(p));
  const [active, setActive] = useState(placed.find((p) => p.slug === initial)?.slug ?? placed[0]?.slug);
  const current = placed.find((p) => p.slug === active) ?? placed[0];
  if (!current) return null;

  return (
    <div className="border-line grid grid-cols-1 overflow-hidden rounded-[28px] border bg-white lg:grid-cols-[1.35fr_1fr]">
      {/* Map */}
      <div className="relative bg-[#e9eef7]">
        <svg
          viewBox={`${-PAD} ${-PAD} ${MAP_W + PAD * 2} ${MAP_H + PAD * 2}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Map of Egypt and Jordan with WeCheapTours destinations"
        >
          <defs>
            <pattern
              id="sea-lines"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(35)"
            >
              <line x1="0" y1="0" x2="0" y2="6" stroke="#d6e0f0" strokeWidth="1" />
            </pattern>
            <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#13213c" floodOpacity="0.25" />
            </filter>
          </defs>
          {/* Land everywhere, then seas cut over it, then our two countries highlighted */}
          <rect x={-PAD} y={-PAD} width={MAP_W + PAD * 2} height={MAP_H + PAD * 2} fill="#eceef2" />
          <path d={MEDITERRANEAN} fill="#dce6f5" />
          <path d={MEDITERRANEAN} fill="url(#sea-lines)" />
          <path d={RED_SEA} fill="#dce6f5" />
          <path d={RED_SEA} fill="url(#sea-lines)" />
          <path d={EGYPT} fill="#ffffff" stroke="#c9d3e3" strokeWidth="1" strokeLinejoin="round" />
          <path d={JORDAN} fill="#ffffff" stroke="#c9d3e3" strokeWidth="1" strokeLinejoin="round" />
          <path d={DEAD_SEA} fill="#cfdcf0" />
          <path d={LAKE_NASSER} fill="#cfdcf0" />
          <path d={NILE} fill="none" stroke="#7fa1d6" strokeWidth="2.4" strokeLinecap="round" />
          <path d={NILE_WEST} fill="none" stroke="#7fa1d6" strokeWidth="1.6" strokeLinecap="round" />
          <path d={NILE_EAST} fill="none" stroke="#7fa1d6" strokeWidth="1.6" strokeLinecap="round" />

          {SEA_LABELS.map((l) => {
            const [x, y] = project(l.at);
            return (
              <text
                key={l.text}
                x={x}
                y={y}
                transform={l.rotate ? `rotate(${l.rotate} ${x} ${y})` : undefined}
                textAnchor="middle"
                fontSize="11"
                fontStyle="italic"
                fill="#7d8fae"
              >
                {l.text}
              </text>
            );
          })}
          {COUNTRY_LABELS.map((l) => {
            const [x, y] = project(l.at);
            return (
              <text
                key={l.text}
                x={x}
                y={y}
                textAnchor="middle"
                fontSize="13"
                fontWeight="700"
                letterSpacing="5"
                fill="#c3ccdb"
              >
                {l.text}
              </text>
            );
          })}

          {placed.map((p) => {
            const [x, y] = project([p.latitude!, p.longitude!]);
            const on = p.slug === current.slug;
            const label = p.fromLabel ? `${p.name}  ${p.fromLabel}` : p.name;
            const w = label.length * 6.3 + 18;
            const left = LABEL_SIDE[p.slug] === "left";
            const lx = left ? x - 10 - w : x + 10;
            return (
              <g
                key={p.slug}
                role="button"
                tabIndex={0}
                aria-label={`${p.name}${p.fromLabel ? `, from ${p.fromLabel}` : ""}`}
                aria-pressed={on}
                className="cursor-pointer outline-none"
                onMouseEnter={() => setActive(p.slug)}
                onFocus={() => setActive(p.slug)}
                onClick={() => setActive(p.slug)}
              >
                <g filter="url(#pin-shadow)" className={on ? undefined : "max-sm:hidden"}>
                  <rect x={lx} y={y - 11} width={w} height={22} rx={11} fill={on ? "#13213c" : "#ffffff"} />
                  <text x={lx + 9} y={y + 4} fontSize="11" fontWeight="600" fill={on ? "#ffffff" : "#13213c"}>
                    {p.name}
                    {p.fromLabel && (
                      <tspan fontWeight="800" fill={on ? "#ffb627" : "#2340b0"}>
                        {"  "}
                        {p.fromLabel}
                      </tspan>
                    )}
                  </text>
                </g>
                <circle
                  cx={x}
                  cy={y}
                  r={on ? 7.5 : 5.5}
                  fill={on ? "#ffb627" : "#2340b0"}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Preview */}
      <div className="flex flex-col p-5 sm:p-7">
        <div className="bg-mist relative aspect-[16/10] overflow-hidden rounded-2xl">
          {current.image && (
            <Image
              key={current.slug}
              src={current.image}
              alt={current.name}
              fill
              sizes="(max-width: 1024px) 90vw, 36vw"
              className="object-cover"
            />
          )}
          <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold backdrop-blur">
            {current.country}
          </span>
        </div>
        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="display-md text-[1.75rem] leading-tight">{current.name}</h3>
            <p className="text-ink-soft mt-1">{current.tagline}</p>
          </div>
          {current.fromLabel && (
            <p className="shrink-0 text-right">
              <span className="text-ink-mute block text-xs">from</span>
              <span className="tabular text-2xl font-extrabold">{current.fromLabel}</span>
            </p>
          )}
        </div>
        <Link href={`/destinations/${current.slug}`} className="btn btn-primary mt-5 justify-between">
          See {current.count} {current.count === 1 ? "option" : "options"} in {current.name}
          <ArrowRight size={18} aria-hidden />
        </Link>

        <ul className="border-line mt-6 flex flex-wrap gap-1.5 border-t pt-5" aria-label="All destinations">
          {placed.map((p) => (
            <li key={p.slug}>
              <button
                type="button"
                onClick={() => setActive(p.slug)}
                aria-pressed={p.slug === current.slug}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  p.slug === current.slug
                    ? "bg-ink text-white"
                    : "bg-mist text-ink-soft hover:bg-lapis-tint hover:text-lapis",
                )}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
        {unplaced.length > 0 && (
          <p className="text-ink-soft mt-4 text-sm">
            Also:{" "}
            {unplaced.map((p, i) => (
              <span key={p.slug}>
                {i > 0 && " · "}
                <Link href={`/destinations/${p.slug}`} className="text-lapis font-semibold hover:underline">
                  {p.name}
                </Link>
                <span className="text-ink-mute">, {p.country}</span>
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
