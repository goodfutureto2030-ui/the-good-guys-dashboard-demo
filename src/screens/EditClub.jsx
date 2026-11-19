import { useState } from "react";
import { Tip, Req } from "../components/ui";

export default function EditClub({ club, meta, onBack, onSave }) {
  // Start with the selected club metadata and keep edits in a controlled form.
  const [f, setF] = useState({ name: club, loc: meta.loc, dir: meta.dir, year: meta.year, bal: meta.bal });
  // Field updater and preview-only balance calculations for the sidebar.
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const bal = Number(f.bal) || 0, net = 2000;
  const fmt = (n) => `$${n.toLocaleString("en-US")}`;
  return (
    <div className="pg">
      {/* Return navigation and selected-club heading. */}
      <div className="back"><Tip className="" tip="Back to Club Log" onClick={onBack} style={{ background: "none", border: 0, color: "var(--g)", fontSize: 16, padding: 0 }}>←</Tip><button onClick={onBack}>Club Log</button>/ Edit club</div>
      <div className="evh"><div><h1 className="h2" style={{ fontSize: 24 }}>Edit Club</h1><p className="sub" style={{ fontSize: 13 }}>Update club details, director assignments, and the reporting year's starting balance.</p></div><span className="tag">{club}</span></div>
      <form className="ec" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
        {/* Editable name/location, director, and reporting/finance sections. */}
        <div>
          <div className="acc"><div className="acs"><div className="evh"><div><h3>Club details</h3><p>The name and location shown throughout the dashboard.</p></div><small style={{ color: "#6b7280" }}><span className="req">*</span> Required</small></div>
            <div className="fld"><label>Club name<Req /></label><div className="in"><input required value={f.name} onChange={set("name")} /></div></div>
            <div className="fld"><label>Location<Req /></label><div className="in"><input required value={f.loc} onChange={set("loc")} /></div><div className="hint">Used to identify this club in event logs and reports.</div></div></div></div>
          <div className="acc"><div className="acs"><h3>Director(s)</h3><p>Assign the primary reviewer for this club log.</p>
            <div className="fld"><label>Primary director<Req /></label><div className="in"><input required value={f.dir} onChange={set("dir")} placeholder="Type the director's name" /></div><div className="hint">Responsible for reviewing events and coaching club performance.</div></div>
          </div></div>
          <div className="acc"><div className="acs"><h3>Reporting &amp; finance</h3><p>Manage the reporting year and its opening club balance.</p>
            <div className="row r2"><div><label>Reporting year<Req /></label><div className="in"><select value={f.year} onChange={set("year")}><option>2025/2026</option><option>2026/2027</option></select></div></div>
              <div><label>Starting / Rollover Balance<Req /></label><div className="in"><span>$</span><input required type="number" min="0" step="0.01" value={f.bal} onChange={set("bal")} /></div></div></div>
            <div className="note"><span>ⓘ</span>The starting balance carries forward from the previous year. Revenue and expenses are calculated from the club's event log.</div></div></div>
        </div>
        {/* Contextual summary and save/cancel actions stay alongside the form. */}
        <aside>
          <div className="cur"><div className="top"><h3>Current club log</h3><span className="yr">{f.year}</span></div>
            <h2>{club}</h2><div className="dr">Director: {meta.dir}</div>
            <div className="kv2"><span>Volunteers</span><b>91</b></div><div className="kv2"><span>People Impacted</span><b>1,250</b></div><div className="kv2"><span>Avg Impact Score</span><b>64.7/100</b></div><hr />
            <h4>Financial summary</h4><div className="kv2"><span>Total Gross Revenue</span><b>$4,000</b></div><div className="kv2"><span>Total Expenses</span><b>$2,000</b></div><div className="kv2"><span>Net Income / Margin</span><b>$2,000</b></div>
            <div className="wb"><small>Current Estimated Working Balance</small><b>{fmt(bal + net)}</b><small>{fmt(bal)} + {fmt(net)} = {fmt(bal + net)}</small></div>
            <small style={{ color: "#6b7280", fontSize: 12 }}>Metrics shown for context. Edit event records in Club Log to update these totals.</small></div>
          <div className="side"><div className="c" style={{ display: "flex", gap: 12 }}><span style={{ color: "var(--g)" }}>🛡</span><div><b style={{ color: "var(--g)" }}>Your event history stays intact</b><br />Editing club details won't change existing events or their verification status.</div></div></div>
        </aside>
        <div className="ecf" style={{ gridColumn: "1 / -1" }}><div><b>Review your changes before saving</b><small>Saving returns you to this club's log. Cancel keeps the existing details.</small></div>
          <div style={{ display: "flex", gap: 12 }}><Tip type="button" className="btn" tip="Discard changes" onClick={onBack}>Cancel</Tip><Tip type="submit" className="btn pri" tip="Save and return to Club Log">✓ Save changes</Tip></div></div>
      </form>
    </div>
  );
}