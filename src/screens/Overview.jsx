import { useState, useMemo } from "react";
import {
  METRICS, TOP, BOT, useVerifiedEvents, sumEvents, fmt, pctChange,
  currentSeasonYear, seasonOf, seasonLabel, inSeason,
} from "../lib/stats";
import { BASE_TOTALS, BASE_THROUGH } from "../data/baseTotals";

export default function Overview() {
  // Verified source logs feed both lifetime totals and season comparisons.
  const { events, loading, error } = useVerifiedEvents();
  const thisSeason = currentSeasonYear();
  const [picked, setPicked] = useState(null);

  // default to the newest season that has verified logs
  // Choose the latest season with data unless a viewer selects a different one.
  const season = useMemo(() => {
    if (picked !== null) return picked;
    if (!events.length) return thisSeason;
    return Math.max(...events.map((e) => seasonOf(e.EventDate)));
  }, [picked, events, thisSeason]);

  const seasons = [thisSeason, thisSeason - 1, thisSeason - 2, thisSeason - 3];
  const cur = inSeason(events, season);
  const prev = inSeason(events, season - 1);

  // Compare the selected season with its predecessor for every metric.
  const trends = METRICS.map((m) => {
    const c = sumEvents(cur, m);
    const p = sumEvents(prev, m);
    const pct = pctChange(c, p);
    const name = m.label.replace("# of ", "");
    const note =
      pct === null ? "No verified logs last season to compare."
      : pct > 0 ? `${name} is up ${pct}% on last season.`
      : pct < 0 ? `${name} is down ${Math.abs(pct)}% on last season.`
      : `${name} is level with last season.`;
    return { m, c, p, pct, note };
  });

  // Total Achievement = the base sheet + every verified log dated after the base cut-off
  const added = events.filter((e) => String(e.EventDate).slice(0, 10) > BASE_THROUGH);
  // Format the historical base totals plus post-cutoff verified activity.
  const full = (v, kind) => {
    const n = Math.round(Number(v) || 0).toLocaleString();
    return kind === "money" ? `$${n}` : kind === "kg" ? `${n}kg` : n;
  };
  const show = (m) => (loading ? "…" : full((BASE_TOTALS[m.id] || 0) + sumEvents(added, m), m.kind));

  return (
    <div className="pg">
      {/* Lifetime achievement totals combine the fixed baseline and new logs. */}
      <h1 className="h2">Total Achievement (2020-)</h1>
      <p className="sub">Totals since February 2020: the original progress sheet (through July 2026) plus {added.length} verified log{added.length === 1 ? "" : "s"} added since.</p>
      {error && <p style={{ color: "var(--red)" }}>Could not load totals: {error.message}</p>}

      <div className="grid g5">{TOP.map((m) => <div className="stat" key={m.id}><span>{m.label}</span><b>{show(m)}</b></div>)}</div>
      <div className="grid g6">{BOT.map((m) => <div className="stat" key={m.id}><span title={m.label}>{m.label}</span><b>{show(m)}</b></div>)}</div>

      {/* Select a season and show per-metric year-over-year movement. */}
      <div className="box">
        <div className="evh">
          <h1 className="h2" style={{ fontSize: 32 }}>Performance Trends to the previous year</h1>
          <select className="sel" aria-label="Period" value={season} onChange={(e) => setPicked(Number(e.target.value))}>
            {seasons.map((y) => <option key={y} value={y}>{seasonLabel(y)}</option>)}
          </select>
        </div>

        <div className="chips">
          <span className="chip">Improving: {trends.filter((t) => t.pct > 0).length}</span>
          <span className="chip w">Worsening: {trends.filter((t) => t.pct < 0).length}</span>
        </div>

        <div className="tr">
          {trends.map(({ m, c, p, pct, note }, i) => (
            <div key={m.id} className={`tc ${pct < 0 ? "bad" : ""} ${m.id === "food" ? "wide" : ""}`}>
              <div className="hd"><span>{m.label}</span><span className="pill">{pct === null ? "New" : `${pct > 0 ? "+" : ""}${pct}%`}</span></div>
              <div className="n">{loading ? "…" : fmt(c, m.kind)} <i>({loading ? "…" : fmt(p, m.kind)})</i></div>
              <p>{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}