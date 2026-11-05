/**
 * Simplified geography of Egypt, Jordan and the seas around them, for the Explore map.
 * Coordinates are [lat, lon]; the projection is a plain equirectangular one scaled for ~29°N.
 * Shapes are deliberately simplified: this is a navigation map, not a survey.
 */

export const VIEW = { lonMin: 24.4, lonMax: 39.8, latMin: 21.4, latMax: 33.7 };
const K = 40; // px per degree of latitude
const X_SCALE = Math.cos((29 * Math.PI) / 180); // shrink longitude at ~29°N

export const MAP_W = Math.round((VIEW.lonMax - VIEW.lonMin) * K * X_SCALE);
export const MAP_H = Math.round((VIEW.latMax - VIEW.latMin) * K);

export function project([lat, lon]: [number, number]): [number, number] {
  return [(lon - VIEW.lonMin) * K * X_SCALE, (VIEW.latMax - lat) * K];
}

type LL = [number, number];

function path(points: LL[], close = true) {
  return (
    points
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${project(p)
            .map((n) => n.toFixed(1))
            .join(" ")}`,
      )
      .join(" ") + (close ? " Z" : "")
  );
}

/** Smooth open line through points (Catmull-Rom → cubic Bézier) */
function smooth(points: LL[]) {
  const pts = points.map(project);
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

const MED_COAST: LL[] = [
  [31.6, 25.15],
  [31.45, 26.4],
  [31.35, 27.25],
  [31.05, 28.3],
  [30.95, 28.9],
  [31.2, 29.9],
  [31.45, 30.4],
  [31.55, 31.0],
  [31.45, 31.8],
  [31.27, 32.3],
  [31.08, 32.9],
  [31.15, 33.6],
  [31.25, 34.0],
  [31.32, 34.22],
];

const SINAI_EAST: LL[] = [
  [29.49, 34.9],
  [28.97, 34.66],
  [28.5, 34.52],
  [27.98, 34.42],
  [27.73, 34.25],
];
const SINAI_WEST: LL[] = [
  [28.24, 33.62],
  [28.75, 33.15],
  [29.35, 32.75],
  [29.95, 32.55],
];
const RED_SEA_WEST: LL[] = [
  [29.6, 32.35],
  [28.95, 32.65],
  [28.36, 33.08],
  [27.7, 33.55],
  [27.26, 33.81],
  [26.75, 33.94],
  [26.1, 34.28],
  [25.07, 34.89],
  [23.95, 35.48],
  [23.0, 35.6],
  [22.2, 36.4],
  [22.0, 36.85],
];

export const EGYPT = path([
  ...MED_COAST,
  ...SINAI_EAST,
  ...SINAI_WEST,
  ...RED_SEA_WEST,
  [22.0, 31.4],
  [22.0, 25.0],
  [29.5, 25.0],
]);

export const JORDAN = path([
  [32.73, 35.57],
  [32.62, 36.0],
  [32.35, 36.85],
  [33.37, 38.79],
  [32.3, 39.3],
  [32.0, 39.0],
  [31.5, 37.0],
  [30.5, 38.0],
  [29.95, 36.75],
  [29.36, 36.07],
  [29.19, 34.96],
  [29.8, 35.1],
  [30.6, 35.25],
  [31.1, 35.4],
  [31.5, 35.48],
  [31.8, 35.55],
  [32.3, 35.56],
]);

/** Mediterranean: coast line closed along the top edge of the frame */
export const MEDITERRANEAN = path([
  [VIEW.latMax, VIEW.lonMin],
  [31.65, VIEW.lonMin],
  ...MED_COAST,
  [31.6, 34.5],
  [32.1, 34.8],
  [32.9, 35.08],
  [33.3, 35.2],
  [VIEW.latMax, 35.5],
]);

/** Red Sea with the gulfs of Suez and Aqaba */
export const RED_SEA = path([
  [29.95, 32.55],
  ...RED_SEA_WEST.slice(0),
  [VIEW.latMin, 37.1],
  [VIEW.latMin, VIEW.lonMax],
  [21.9, 39.1],
  [23.4, 38.6],
  [24.1, 37.9],
  [25.5, 36.7],
  [26.5, 36.1],
  [27.6, 35.25],
  [28.05, 34.85],
  [28.8, 34.85],
  [29.36, 34.97],
  [29.53, 35.0],
  [29.49, 34.9],
  ...SINAI_EAST.slice(1),
  ...SINAI_WEST,
]);

export const DEAD_SEA = path([
  [31.78, 35.5],
  [31.75, 35.58],
  [31.4, 35.56],
  [31.1, 35.47],
  [31.2, 35.38],
  [31.6, 35.43],
]);

/** The Nile from Lake Nasser to the Delta */
export const NILE = smooth([
  [22.0, 31.45],
  [22.9, 32.0],
  [23.6, 32.6],
  [24.09, 32.9],
  [24.45, 32.93],
  [24.98, 32.87],
  [25.29, 32.55],
  [25.69, 32.64],
  [26.16, 32.72],
  [26.05, 32.24],
  [26.56, 31.69],
  [27.18, 31.18],
  [28.1, 30.75],
  [29.07, 31.1],
  [30.04, 31.24],
  [30.6, 31.05],
]);
export const NILE_WEST = smooth([
  [30.6, 31.05],
  [31.0, 30.75],
  [31.4, 30.42],
]);
export const NILE_EAST = smooth([
  [30.6, 31.05],
  [31.0, 31.4],
  [31.42, 31.81],
]);
export const LAKE_NASSER = path([
  [24.0, 32.88],
  [23.6, 32.75],
  [23.1, 32.3],
  [22.6, 31.8],
  [22.0, 31.3],
  [22.0, 31.7],
  [22.7, 32.2],
  [23.3, 32.7],
  [23.8, 33.0],
]);

/** Pin positions for seeded destinations, by slug. New destinations without an entry simply don't get a pin. */
export const DEST_COORDS: Record<string, LL> = {
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

/** Which side of the pin the price label sits, so neighbours don't collide */
export const LABEL_SIDE: Record<string, "left" | "right"> = {
  alexandria: "left",
  cairo: "right",
  giza: "left",
  luxor: "left",
  aswan: "left",
  hurghada: "left",
  "sharm-el-sheikh": "right",
  "marsa-alam": "right",
  amman: "right",
  petra: "right",
  "wadi-rum": "right",
  "dead-sea": "left",
};

export const SEA_LABELS: { text: string; at: LL; rotate?: number }[] = [
  { text: "Mediterranean Sea", at: [32.6, 28.4] },
  { text: "Red Sea", at: [24.4, 36.4], rotate: -52 },
  { text: "Nile", at: [27.3, 30.9], rotate: -62 },
];

export const COUNTRY_LABELS: { text: string; at: LL }[] = [
  { text: "EGYPT", at: [26.4, 28.0] },
  { text: "JORDAN", at: [31.0, 37.4] },
];
