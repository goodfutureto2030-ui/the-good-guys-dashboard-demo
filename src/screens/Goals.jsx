import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { METRICS, TOP, BOT, sumGoals, fmt } from "../lib/stats";
import GoalEdit from "./GoalEdit";
import photoL from "../assets/Goalimage.png";   // swap the two if they land on the wrong sides
import photoR from "../assets/Goalimage2.png";

const yearOf = (r) => String(r.PeriodStart).slice(0, 4);

export default function Goals({ canEdit = false }) {
  // Editor visibility, loaded goal rows, selected year, and refresh state.
  const [editing, setEditing] = useState(false);
  const [all, setAll] = useState([]);          // every goal row that has a date
  const [yearPick, setYearPick] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [tick, setTick] = useState(0);

  // Reload saved goals whenever the editor closes or the page requests a refresh.
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setLoadErr("");
      const { data, error } = await supabase.from("Goals").select("*").not("PeriodStart", "is", null);
      if (!alive) return;
      if (error) { setLoadErr(error.message); setAll([]); } else { setAll(data); }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [tick]);

  // which year to show: the one picked (or just saved), otherwise the nearest year that has real goals
  const years = [...new Set(all.map(yearOf))].sort();
  const rowsOf = (y) => all.filter((r) => yearOf(r) === y);
  const hasGoals = (y) => METRICS.some((m) => sumGoals(rowsOf(y), m) > 0);
  const real = years.filter(hasGoals);
  const pool = real.length ? real : years;
  const thisYear = String(new Date().getFullYear());
  const year = years.includes(yearPick) ? yearPick : (pool.find((y) => y >= thisYear) ?? pool[pool.length - 1] ?? null);
  const rows = year ? rowsOf(year) : [];

  // Return the editor in place, then refresh and select its saved year on close.
  if (editing) {
    return (
      <GoalEdit
        onClose={(savedYear) => {
          setEditing(false);
          if (typeof savedYear === "number") setYearPick(String(savedYear));
          setTick((t) => t + 1);
        }}
      />
    );
  }

  // the title and every number come from the same year's rows
  const show = (m) => (loading ? "…" : rows.length ? fmt(sumGoals(rows, m), m.kind) : "—");

  return (
    <div className="goals">
      {/* Goal-year heading and optional selector for years with stored records. */}
      {canEdit && <button className="btn editb" onClick={() => setEditing(true)}>Edit the goals</button>}
      <h1>Welcome to The Good Guys Dashboard</h1>
      <h3>{year ? `Goal for ${year}` : loading ? "Loading goals…" : "No goals set yet"}</h3>

      {years.length > 1 && (
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <select className="sel" aria-label="Goal year" value={year ?? ""} onChange={(e) => setYearPick(e.target.value)}>
            {[...years].reverse().map((y) => <option key={y} value={y}>{y}{hasGoals(y) ? "" : " (empty)"}</option>)}
          </select>
        </div>
      )}
      {loadErr && <p style={{ textAlign: "center", color: "var(--red)" }} role="alert">Could not load goals: {loadErr}</p>}

      {/* Display goal totals from the selected year in the shared metric order. */}
      <div className="grid g5">{TOP.map((m) => <div className="stat" key={m.id}><span>{m.label}</span><b>{show(m)}</b></div>)}</div>
      <div className="grid g6">{BOT.map((m) => <div className="stat" key={m.id}><span title={m.label}>{m.label}</span><b>{show(m)}</b></div>)}</div>

      <img className="gp gp-l" src={photoL} alt="Bottled water donation" />
      <img className="gp gp-r" src={photoR} alt="Volunteers packing" />
    </div>
  );
}