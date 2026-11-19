import { useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * The "Volunteers" card at the top of Club Log: the club's total members.
 * Club leaders edit their own club's number, admins can edit any club's.
 * The impact score uses it as the club's size.
 *   clubId   the club being shown
 *   members  current number, or null when it has not been set
 */
export default function ClubMembers({ clubId, members, onSaved }) {
  // Track the inline edit form, pending save, and any request validation error.
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Validate the member count before persisting it for the selected club.
  const save = async () => {
    const n = Number(val);
    if (!Number.isInteger(n) || n < 1 || n > 1000) { setErr("Enter a whole number from 1 to 1000."); return; }
    setBusy(true); setErr("");
    const { error } = await supabase.rpc("set_club_members", { p_club: clubId, p_count: n });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEditing(false);
    onSaved?.();
  };

  return (
    <div className="kc">
      <span className="kp">Volunteers</span>

      {/* Show the editable count or its current value, depending on edit mode. */}
      {editing ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0 8px" }}>
          <input className="bal-in" type="number" min="1" max="1000" step="1" value={val} autoFocus aria-label="Total club members"
            onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
          <button className="btn pri" style={{ padding: "6px 12px" }} disabled={busy} onClick={save}>{busy ? "…" : "Save"}</button>
          <button className="btn" style={{ padding: "6px 12px" }} disabled={busy} onClick={() => { setEditing(false); setErr(""); }}>Cancel</button>
        </div>
      ) : (
        <b>{clubId ? (members ?? "Not set") : "—"}</b>
      )}

      <p>Total club members. Leaders and admins can edit it, and it sets the club's size in the impact score.</p>

      {/* Editing is available only when a specific club is selected. */}
      {!editing && (clubId
        ? <button className="linkbtn" onClick={() => { setVal(members ? String(members) : ""); setEditing(true); }}>{members ? "Edit total members" : "Enter total members"}</button>
        : <small style={{ color: "var(--mut)" }}>Pick a club first.</small>)}
      {err && <small style={{ display: "block", color: "var(--red)", marginTop: 4 }} role="alert">{err}</small>}
    </div>
  );
}