import { useState } from "react";
import { Tip, Req } from "../components/ui";

export default function AddClub({ onBack, onSave, current }) {
  // Form data, selected directors, and the director-picker visibility.
  const [f, setF] = useState({ name: "", loc: "", email: "", year: "2025/2026", bal: "" });
  const [dirs, setDirs] = useState([]);
  const [open, setOpen] = useState(false);
  // Bind a form field to its matching property in the draft object.
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  // Allow multiple directors and remove an existing selection on repeat clicks.
  const toggle = (d) => setDirs(dirs.includes(d) ? dirs.filter((x) => x !== d) : [...dirs, d]);
  // Require at least one director before passing the new club to the parent.
  const submit = (e) => { e.preventDefault(); if (dirs.length) onSave({ ...f, dirs }); else setOpen(true); };
  return (
    <div className="pg">
      {/* Navigation context and a short description of the new-club workflow. */}
      <div className="bc"><button onClick={onBack}>Club Log</button><i>|</i>Add a club</div>
      <h1 className="h2" style={{ fontSize: 24 }}>Add a club</h1>
      <p className="sub" style={{ fontSize: 13 }}>Set up a new club, assign its director, and establish its opening balance for the academic year.</p>
      <div className="ac">
        {/* Main form collects identity, contacts, and initial finance settings. */}
        <form className="acc" onSubmit={submit}>
          <div className="hd">New club details<small><span className="req">*</span> Required fields</small></div>
          <div className="acs"><h3>Club information</h3><p>Choose the name and code that will appear in the club selector.</p>
            <div className="fld"><label>Club name<Req /></label><div className="in"><input required placeholder="e.g. North Vancouver" value={f.name} onChange={set("name")} /></div><div className="hint">Use the club's official name.</div></div>
            <div className="fld"><label>Location<Req /></label><div className="in"><input required placeholder="e.g. North Vancouver, BC" value={f.loc} onChange={set("loc")} /></div><div className="hint">Enter the city or community served by the club.</div></div></div>
          <div className="acs"><h3>Director &amp; contact</h3><p>Assign the person responsible for reviewing this club's log.</p>
            <div className="fld"><label>Director(s)<Req /></label>
              <div className="dd"><button type="button" className="in" aria-expanded={open} onClick={() => setOpen(!open)} style={{ color: dirs.length ? "var(--ink)" : "#9ca3af" }}><span>{dirs.length ? dirs.join(", ") : "Select director(s)"}</span><span>⌄</span></button>
                {open && <ul>{DIRECTORS.map((d) => <li key={d}><label><input type="checkbox" checked={dirs.includes(d)} onChange={() => toggle(d)} />{d}</label></li>)}</ul>}</div>
              <div className="hint">Choose one or more directors from the existing team.</div></div>
            <div className="fld"><label>Contact email</label><div className="in"><input type="email" placeholder="e.g. club@goodguys.ca" value={f.email} onChange={set("email")} /></div><div className="hint">Optional. Use a shared club email or the primary director's email.</div></div></div>
          <div className="acs"><h3>Academic year &amp; opening balance</h3><p>Set the reporting year and the funds available before the first event.</p>
            <div className="row r2"><div><label>Academic year<Req /></label><div className="in"><select value={f.year} onChange={set("year")}><option>2025/2026</option><option>2026/2027</option></select></div><div className="hint">The year for this club's first event log.</div></div>
              <div><label>Starting / Rollover Balance<Req /></label><div className="in"><span>$</span><input required type="number" min="0" step="0.01" placeholder="0.00" value={f.bal} onChange={set("bal")} /><span style={{ fontSize: 12 }}>CAD</span></div><div className="hint">Enter existing funds, or leave at $0.00 for a new club.</div></div></div>
            <div className="note"><span>ⓘ</span>This amount becomes the Starting / Rollover Balance in the club's Financial summary. It is not recorded as event revenue.</div></div>
          <div className="acf"><span>The club will appear in Club Log once added.</span><div style={{ display: "flex", gap: 12 }}><Tip type="button" className="btn" tip="Discard and go back" onClick={onBack}>Cancel</Tip><Tip type="submit" className="btn pri" tip="Create this club">Add a club</Tip></div></div>
        </form>
        {/* Sidebar reminds administrators where the new club appears next. */}
        <aside className="side">
          <div className="c"><h4>Club Log</h4>You're adding a new club from the executive view.<p>Currently selected club:<br /><b>{current}</b></p><p>Academic year:<br /><b>2025/2026</b></p>Adding a club won't change the selected club's events or balances.</div>
          <div className="c g"><h4>After adding the club</h4><ul><li>Select it from the club selector.</li><li>Start logging events for the academic year.</li><li>Review performance and finances in Club Log.</li></ul></div>
        </aside>
      </div>
    </div>
  );
}