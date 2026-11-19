import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { METRICS } from "../lib/stats";

const pick = (...ids) => ids.map((id) => METRICS.find((m) => m.id === id));
const GROUPS = [
  ["Events and community", "Set targets for events, fundraising, volunteers and community participation.", pick("events", "money", "vol", "sponsor", "shelters", "people")],
  ["Donations and distribution", "Set annual targets for items collected and distributed.", pick("sandwiches", "care", "food", "water", "clothing")],
];
const UNIT = (m) => (m.kind === "money" ? "$" : m.kind === "kg" ? "kg" : "");

export default function GoalEdit({ onClose }) {
  // Keep the target year and all form values as controlled state.
  const [year, setYear] = useState(new Date().getFullYear() + 1);
  const [all, setAll] = useState([]);      // every row in Goals (small table)
  const [vals, setVals] = useState({});    // metric id -> input text
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // the diagram truncated one column name, so use the real name from a saved row if there is one
  // Resolve historical column-name truncation against the loaded table schema.
  const colName = (name) => {
    const sample = all[0];
    if (!sample || name in sample) return name;
    return Object.keys(sample).find((k) => k.startsWith(name.slice(0, 16))) || name;
  };
  // Current-year rows drive the form's initial values and replacement operation.
  const yearRows = all.filter((r) => String(r.PeriodStart).slice(0, 4) === String(year));

  // load goals once
  // Load existing goal rows once when the editor opens.
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("Goals").select("*");
      if (error) setErr(error.message);
      setAll(data || []);
      setLoading(false);
    })();
  }, []);

  // show the current numbers for the selected year
  // Populate each metric from the selected year's combined goal rows.
  useEffect(() => {
    const next = {};
    METRICS.forEach((m) => {
      const total = yearRows.reduce((a, r) => a + (Number(r[colName(m.goalCol)]) || 0), 0);
      next[m.id] = yearRows.length ? String(total) : "";
    });
    setVals(next);
  }, [year, all]); // eslint-disable-line

  // Insert the replacement goal row before deleting old rows to avoid data loss.
  const save = async () => {
    setSaving(true); setErr("");
    const start = `${year}-01-01`;
    const row = { PeriodStart: start, PeriodEnd: `${year}-12-31` };
    METRICS.forEach((m) => { row[colName(m.goalCol)] = Number(vals[m.id]) || 0; });

    if (METRICS.every((m) => !(Number(vals[m.id]) > 0))) { setSaving(false); return setErr("Enter at least one goal number first."); }

    // 1. add the new goals first, so nothing is lost if this fails
    const ins = await supabase.from("Goals").insert(row).select();
    if (ins.error) { setSaving(false); return setErr(`Could not save: ${ins.error.message}`); }
    if (!ins.data?.length) { setSaving(false); return setErr("Nothing was saved. The Goals table is blocking this account."); }

    // 2. then remove the old rows for that year so numbers are not added together
    const oldIds = yearRows.map((r) => r.id);
    if (oldIds.length) {
      const del = await supabase.from("Goals").delete().in("id", oldIds);
      if (del.error) { setSaving(false); return setErr(`Saved, but old goals were not removed: ${del.error.message}`); }
    }

    setSaving(false);
    onClose(year); // the Goals page opens on the year that was just saved
  };

  return (
    <div className="pg">
      {/* Year selection and the read-only date range for the chosen target. */}
      <div className="back"><button onClick={() => onClose()}>← Goals</button><i>/</i> Edit goals</div>
      <div className="acc ge">
        <div className="hd">Goal entry content <small>{loading ? "Loading…" : "Current numbers are filled in"}</small></div>

        <div className="acs">
          <div className="row r2">
            <div className="fld">
              <label>Goal year</label>
              <div className="in v">
                <select value={year} onChange={(e) => setYear(+e.target.value)}>
                  {[2026, 2027, 2028, 2029].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="fld">
              <label>Target period</label>
              <div className="in gold v">Jan 1, {year} – Dec 31, {year}</div>
            </div>
          </div>
        </div>

        {/* Metric groups organize related targets and share one save operation. */}
        {GROUPS.map(([title, desc, metrics]) => (
          <div className="acs" key={title}>
            <h3>{title}</h3>
            <p>{desc}</p>
            <div className="row r3">
              {metrics.map((m) => (
                <div className="fld" key={m.id}>
                  <label>{m.label}</label>
                  <div className="in v">
                    <input type="number" min="0" value={vals[m.id] ?? ""}
                      onChange={(e) => setVals((p) => ({ ...p, [m.id]: e.target.value }))} />
                    <small>{UNIT(m)}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Validation feedback and footer actions complete the editor. */}
        {err && <p className="ge-err" role="alert">{err}</p>}
        <div className="acf">
          <span>Saving replaces the {year} goals shown on the Goals page.</span>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn" onClick={() => onClose()}>Cancel</button>
            <button className="btn pri" onClick={save} disabled={saving || loading}>{saving ? "Saving…" : "Save goals"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}