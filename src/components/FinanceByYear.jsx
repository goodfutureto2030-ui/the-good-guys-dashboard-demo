import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { currentSeasonYear, seasonOf } from "../lib/stats";
import { buildSeasonTable } from "../lib/finance";
import { STATUS } from "./ReviewActions";

const money = (v) => {
  const n = Number(v) || 0;
  return `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};
const short = (y) => `${y}/${String(y + 1).slice(2)}`;
const NOTE = {
  entered: "Entered by the club or an admin",
  rolled: "Rolled over from last season's ending balance",
  none: "Not set yet",
};
const num = { color: "var(--ink)" }; // numbers are black, not green

/**
 * events      logs to total up (only Verified ones count). A log belongs to the season of its EVENT DATE
 *             (Sep 1 to Aug 31), so 2025-11-03 falls in 2025/26.
 * seasonRows  rows of ClubSeasons: { ClubId, SeasonStart, StartingBalance }
 * clubId      the club whose starting balance can be changed
 * canEdit     show the edit button (club leader of that club, or an admin)
 * clubName    optional (id) => name, adds a Club column to the records list
 */
export default function FinanceByYear({ events = [], seasonRows = [], clubId = null, canEdit = false, onSaved, clubName }) {
  // Build the season-level totals from current logs and saved starting balances.
  const thisSeason = currentSeasonYear();
  const table = useMemo(() => buildSeasonTable(events, seasonRows, thisSeason), [events, seasonRows, thisSeason]);

  // Track the selected season and starting-balance editor state.
  const [picked, setPicked] = useState(null);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // open on the newest season that has verified logs
  const withLogs = table.filter((r) => r.n > 0);
  const fallback = withLogs.length ? withLogs[withLogs.length - 1].s : thisSeason;
  const sel = table.find((r) => r.s === (picked ?? fallback)) || table[table.length - 1];
  const newestFirst = [...table].reverse();

  // the records behind the selected season, newest first
  // Filter the selected season's verified event records for the detail table.
  const records = useMemo(
    () => events
      .filter((e) => e.Status === STATUS.VERIFIED && seasonOf(e.EventDate) === sel.s)
      .sort((a, b) => String(b.EventDate).localeCompare(String(a.EventDate))),
    [events, sel.s]
  );

  // Change seasons and discard any unsaved edit/error from the previous one.
  const choose = (s) => { setPicked(s); setEditing(false); setErr(""); };

  // Save the selected club's starting balance through the database helper.
  const save = async () => {
    const n = Number(val);
    if (val.trim() === "" || !Number.isFinite(n)) { setErr("Enter a number."); return; }
    setBusy(true); setErr("");
    const { error } = await supabase.rpc("set_starting_balance", { p_club: clubId, p_season: sel.s, p_amount: n });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEditing(false);
    onSaved?.();
  };

  return (
    <div className="box" style={{ borderRadius: 18, marginBottom: 22 }}>
      {/* Season controls and the balance/revenue summary cards. */}
      <div className="evh">
        <div>
          <h3 className="h2" style={{ fontSize: 22 }}>Financial summary</h3>
          <p className="sub" style={{ fontSize: 13, marginBottom: 0 }}>Season {short(sel.s)} · by event date · verified logs only</p>
        </div>
        <select className="sel" style={{ padding: "8px 14px", fontSize: 14 }} aria-label="Season" value={sel.s} onChange={(e) => choose(Number(e.target.value))}>
          {newestFirst.map((r) => <option key={r.s} value={r.s}>{short(r.s)}</option>)}
        </select>
      </div>

      <div className="fin" style={{ marginTop: 16 }}>
        <div className="fcard">
          <span>Starting / Rollover Balance</span>
          {editing ? (
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <input className="bal-in" type="number" step="0.01" value={val} autoFocus aria-label="Starting balance"
                onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
              <button className="btn pri" style={{ padding: "6px 12px" }} disabled={busy} onClick={save}>{busy ? "…" : "Save"}</button>
              <button className="btn" style={{ padding: "6px 12px" }} disabled={busy} onClick={() => { setEditing(false); setErr(""); }}>Cancel</button>
            </div>
          ) : <b style={num}>{money(sel.start)}</b>}
          <small style={{ display: "block", color: "var(--mut)", fontSize: 12, marginTop: 4 }}>{NOTE[sel.source]}</small>
          {canEdit && clubId && !editing && (
            <button className="linkbtn" onClick={() => { setVal(String(sel.start)); setEditing(true); }}>Edit starting balance</button>
          )}
          {canEdit && !clubId && <small style={{ display: "block", color: "var(--mut)", fontSize: 12, marginTop: 4 }}>Pick a club to edit it.</small>}
          {err && <small style={{ display: "block", color: "var(--red)", marginTop: 4 }} role="alert">{err}</small>}
        </div>
        <div className="fcard"><span>Total Gross Revenue</span><b style={num}>{money(sel.gross)}</b></div>
        <div className="fcard"><span>Total Expenses</span><b style={num}>{money(sel.exp)}</b></div>
        <div className="fcard"><span>Net Income / Margin</span><b style={num}>{money(sel.net)}</b></div>
        <div className="fcard"><span>Current Estimated Working Balance</span><b style={num}>{money(sel.end)}</b></div>
      </div>

      {/* Show the arithmetic behind net income and estimated ending balance. */}
      <div className="frm">
        <div className="fcard"><span>Net Income = Total Revenue − Total Expenses</span><b style={num}>{money(sel.gross)} − {money(sel.exp)} = {money(sel.net)}</b></div>
        <div className="fcard"><span>Current Estimated Working Balance = Starting Balance + Net Income</span><b style={num}>{money(sel.start)} + {money(sel.net)} = {money(sel.end)}</b></div>
      </div>

      {/* Season totals are selectable; the records table below follows the choice. */}
      <h4 style={{ margin: "6px 0 8px", color: "var(--g)" }}>Year by year</h4>
      <div className="scroll">
        <table className="tbl">
          <thead><tr>{["Season", "Starting balance", "Gross revenue", "Expenses", "Net income", "Ending balance", "Verified events"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {newestFirst.map((r) => (
              <tr key={r.s} onClick={() => choose(r.s)} style={{ cursor: "pointer", background: r.s === sel.s ? "#f3f8f3" : undefined }}>
                <td style={num}><b>{short(r.s)}</b></td>
                <td style={num}>{money(r.start)}{r.source === "rolled" && <small title={NOTE.rolled} style={{ color: "var(--mut)" }}> ↺</small>}</td>
                <td style={num}>{money(r.gross)}</td>
                <td style={num}>{money(r.exp)}</td>
                <td style={num}><b>{money(r.net)}</b></td>
                <td style={num}><b>{money(r.end)}</b></td>
                <td style={num}>{r.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sub" style={{ fontSize: 12, margin: "8px 0 14px" }}>↺ = rolled over from the previous season's ending balance. Click a row to open that season.</p>

      {/* Verified logs for the currently selected season, newest date first. */}
      <h4 style={{ margin: "6px 0 8px", color: "var(--g)" }}>Records in {short(sel.s)} ({records.length})</h4>
      <div className="scroll" style={{ maxHeight: 320, overflowY: "auto" }}>
        <table className="tbl">
          <thead><tr>{["Event date", "Event", ...(clubName ? ["Club"] : []), "Net revenue", "Expenses"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {!records.length && <tr><td colSpan={clubName ? 5 : 4} style={{ color: "var(--mut)" }}>No verified logs with an event date in this season.</td></tr>}
            {records.map((e) => (
              <tr key={e.id}>
                <td style={num}>{String(e.EventDate).replaceAll("-", "/")}</td>
                <td style={num}><b>{e.EventKinds}</b></td>
                {clubName && <td style={num}>{clubName(e.ClubId)}</td>}
                <td style={num}>{money(e.NetRevenue)}</td>
                <td style={num}>{money(e.Expenses)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}