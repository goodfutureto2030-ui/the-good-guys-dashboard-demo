/* =====================================================================
   Standardized Impact Score  S in [0, 100]
   Implements the "Data Analysis" and "Edge case" notes.

   Stage 1  raw data      (one log = one row of EventsActivitiesTable)
   Stage 2  normalization (weighted items, club size, location, log curve)
   Stage 3  category weighting
   Stage 4  final score = sum of the weighted sub-scores
   ===================================================================== */


// Stage 2: weight of each physical item.
// 2.5 / 3.0 are from the notes. WaterBottles is NOT in the notes: placeholder.
export const ITEM_WEIGHTS = { SandWichesCount: 2.5, CarePackages: 3.0, Clothing: 3.0, WaterBottles: 1.0 };

// Baselines ("just for this example" in the notes). They are meant to come
// from past data later. funds is NOT in the notes: placeholder.
export const BASELINES = {
  goods: 2200,        // average scaled ratio score from the past
  reach: 1000,        // normalized number of people impacted
  productivity: 15,   // output per volunteer-hour (sandwich distribution)
  funds: 1000,        // net revenue in $
};

export const NEUTRAL_CLUB_SIZE = 20;  // size 20 -> club scale 1.0
export const CAP_SUBSCORES = false;   // the worked example lets Goods reach 104.45, so false reproduces 96.26

// Stage 3: category weighting
export const CATEGORY_WEIGHTS = {
  fundraiser:   { funds: 0.6, goods: 0,    reach: 0.2,  volunteer: 0.2 },
  directRelief: { funds: 0,   goods: 0.5,  reach: 0.3,  volunteer: 0.2 },
  general:      { funds: 0.25, goods: 0.25, reach: 0.25, volunteer: 0.25 },
};

// Location hardness multiplier (1.0 for a school)
export const LOCATION_RULES = [{ test: /downtown\s*eastside|dtes/i, mult: 1.25 }];

// Volunteer productivity (% of baseline) -> mapped points. From the "Mapping Curve" box.
// The 100% point is written "70~75" in the notes; 75 is used here.
export const PRODUCTIVITY_CURVE = [[0, 0], [50, 50], [100, 75], [118.8, 80], [200, 90]];

export const DIMENSIONS = [
  { key: "funds",     label: "Financial",            color: "#3d6640" },
  { key: "goods",     label: "Goods (RU)",           color: "#111827" },
  { key: "reach",     label: "Reach",                color: "#e8dcc0" },
  { key: "volunteer", label: "Volunteer Efficiency", color: "#b5483a" },
];

/* ---------- helpers ---------- */
const num = (v) => Number(v) || 0;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const cap = (x) => (CAP_SUBSCORES ? clamp(x, 0, 100) : Math.max(0, x));

// "0 -> 100 matters more than 1000 -> 1100": natural log against the baseline
const logScore = (actual, baseline) => (Math.log(1 + Math.max(0, actual)) / Math.log(1 + baseline)) * 100;

// piecewise-linear lookup on the mapping curve; above the last point it stays flat
function curve(x) {
  const pts = PRODUCTIVITY_CURVE;
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    if (x <= x1) {
      const [x0, y0] = pts[i - 1];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
}

export function categoryKey(category = "") {
  const c = String(category).toLowerCase();
  if (c.includes("fundrais")) return "fundraiser";
  if (c.includes("direct")) return "directRelief";
  return "general"; // General / Baseline / Community
}

export function locationMultiplier(location = "") {
  return LOCATION_RULES.find((r) => r.test.test(String(location)))?.mult ?? 1.0;
}

/* ---------- one log -> score ---------- */
export function scoreEvent(e) {
  const clubSize = num(e.ClubSize) > 0 ? num(e.ClubSize) : null;
  const w = CATEGORY_WEIGHTS[categoryKey(e.Category)];

  // Stage 2: goods
  const ratioScore = Object.entries(ITEM_WEIGHTS).reduce((a, [col, wt]) => a + num(e[col]) * wt, 0);
  const clubScale = Math.sqrt((clubSize ?? NEUTRAL_CLUB_SIZE) / 20); // (size / 20) ^ 0.5
  const locMult = locationMultiplier(e.Location);
  const scaledRatio = (ratioScore / clubScale) * locMult;             // small clubs get a boost

  const goods = cap((scaledRatio / BASELINES.goods) * 100);
  const reach = cap(logScore(num(e.PeopleImpacted), BASELINES.reach));
  const funds = cap(logScore(num(e.NetRevenue), BASELINES.funds));

  // Stage 2: volunteer = 50% turnout + 50% mapped productivity
  const volunteers = num(e.Volunteers);
  const volunteerHours = num(e.Duration) * volunteers;               // 5 hr x 10 people = 50
  const turnout = clubSize ? clamp((volunteers / clubSize) * 100, 0, 100) : 100;
  const productivity = volunteerHours > 0 ? ratioScore / volunteerHours : 0;       // 1300 / 50 = 26
  const productivityScore = logScore(productivity, BASELINES.productivity);        // ~118.87
  const volunteer = 0.5 * turnout + 0.5 * curve(productivityScore);

  const subs = { funds, goods, reach, volunteer };
  const contrib = {};
  let score = 0;
  for (const d of DIMENSIONS) {
    contrib[d.key] = w[d.key] * subs[d.key];
    score += contrib[d.key];
  }

  return {
    score: clamp(score, 0, 100),
    subs, contrib, weights: w,
    detail: { ratioScore, clubScale, locMult, scaledRatio, turnout, productivity, productivityScore, volunteerHours },
    missingClubSize: clubSize === null,
  };
}

/* ---------- many logs -> club summary (decomposition) ---------- */
export function summarize(results) {
  if (!results.length) return null;
  const n = results.length;
  const dims = DIMENSIONS.map((d) => {
    const used = results.filter((r) => r.weights[d.key] > 0);
    return {
      ...d,
      pts: results.reduce((a, r) => a + r.contrib[d.key], 0) / n,
      sub: used.length ? used.reduce((a, r) => a + r.subs[d.key], 0) / used.length : 0,
      used: used.length,
    };
  });
  return { score: results.reduce((a, r) => a + r.score, 0) / n, dims, n };
}

// Labels are a placeholder: adjust the thresholds to your own definition
export function performanceLabel(score) {
  if (score >= 85) return "Excellent Performance";
  if (score >= 70) return "Strong Performance";
  if (score >= 55) return "Solid Performance";
  return "Needs Improvement";
}