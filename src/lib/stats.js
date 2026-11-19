import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { STATUS } from "../components/ReviewActions";

/* One definition per number on the dashboard.
   col     = column in EventsActivitiesTable (summed over Verified logs)
   goalCol = column in Goals                                             */
export const METRICS = [
  { id: "events",     label: "# of Events Hosted",            goalCol: "EventCount" },                            // counts rows
  { id: "money",      label: "Money Fund-raised",             kind: "money", col: "NetRevenue", goalCol: "MoneyFundraised" },
  { id: "vol",        label: "Volunteers Involved",           col: "Volunteers",               goalCol: "VolunteerInvolved" },
  { id: "sponsor",    label: "Community Sponsor Involved",    col: "CommunitySponsorInvolved", goalCol: "CommunitySponsorInvolved" },
  { id: "shelters",   label: "Shelters Impacted",             col: "SheltersImpacted",         goalCol: "SheltersImpacted" },
  { id: "people",     label: "# of People Impacted",          col: "PeopleImpacted",           goalCol: "PeopleImpacted" },
  { id: "sandwiches", label: "Sandwiches Donated",            col: "SandWichesCount",               goalCol: "Sandwiches" },
  { id: "care",       label: "Care Packages Distributed",     col: "CarePackages",             goalCol: "CarePackages" },
  { id: "food",       label: "Non Perishable Food Collected", kind: "kg", col: "Non-PerishableFood", goalCol: "Non-PerishableFood" },
  { id: "water",      label: "Water Bottles Donated",         col: "WaterBottles",             goalCol: "WaterBottles" },
  { id: "clothing",   label: "Clothing Collected&Donated",    col: "Clothing",                 goalCol: "Clothing" },
];
export const TOP = METRICS.slice(0, 5); // first row of cards
export const BOT = METRICS.slice(5);    // second row of cards

/* ---------- reading values safely ---------- */
// The diagram truncated one column name, so fall back to a prefix match.
// Normalize missing or non-numeric database values to zero.
const read = (row, name) => {
  if (!row) return 0;
  const key = name in row ? name : Object.keys(row).find((k) => k.startsWith(name.slice(0, 16)));
  return Number(row[key]) || 0;
};

// Aggregate either event counts or the configured numeric event column.
export const sumEvents = (events, m) =>
  m.id === "events" ? events.length : events.reduce((a, e) => a + read(e, m.col), 0);

// Combine matching goal-column values across all stored goal rows.
export const sumGoals = (rows, m) => rows.reduce((a, r) => a + read(r, m.goalCol), 0);

/* ---------- formatting ---------- */
const compact = (n) =>
  n >= 10000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : n.toLocaleString();

// Apply compact number formatting plus any metric-specific unit.
export const fmt = (v, kind) => {
  const s = compact(Number(v) || 0);
  return kind === "money" ? `$${s}` : kind === "kg" ? `${s}kg` : s;
};

// % change vs the previous period. null = nothing to compare with.
export const pctChange = (cur, prev) =>
  prev === 0 ? (cur === 0 ? 0 : null) : Math.round(((cur - prev) / prev) * 100);

/* ---------- seasons run Sep 1 to Aug 31 ---------- */
export const currentSeasonYear = () => {
  const d = new Date();
  return d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
};
export const seasonOf = (dateStr) => {
  const y = Number(String(dateStr).slice(0, 4));
  const m = Number(String(dateStr).slice(5, 7));
  return m >= 9 ? y : y - 1;
};
// Keep season labels and event filtering aligned with the September start date.
export const seasonLabel = (y) => `${y} Sep–${y + 1} Aug`;
export const inSeason = (events, y) => events.filter((e) => seasonOf(e.EventDate) === y);


/* ---------- load every Verified log (admins see all clubs) ---------- */
export function useVerifiedEvents() {
  // Store all verified logs plus loading and query-error state.
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Ignore late results after unmount and page through Supabase's row limit.
    let alive = true;
    (async () => {
      const all = [];
      const size = 1000; // Supabase returns at most 1000 rows per request
      for (let from = 0; ; from += size) {
        const { data, error } = await supabase
          .from("EventsActivitiesTable")
          .select("*")
          .eq("Status", STATUS.VERIFIED)
          .range(from, from + size - 1);
        if (error) { if (alive) { setError(error); setLoading(false); } return; }
        all.push(...data);
        if (data.length < size) break;
      }
      if (alive) { setEvents(all); setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  return { events, loading, error };
}