import { useState } from "react";
import { supabase } from "../lib/supabase";
import { scoreEvent } from "../lib/ImpactScore";

// Numeric columns collected by this form and written to EventsActivitiesTable.
const NUM = [
  ["ClubSize", "Club members (size of the club)"],
  ["Volunteers", "Volunteers who took part"],
  ["VolunteerHour", "Volunteer hours"],
  ["PeopleImpacted", "People impacted"],
  ["SheltersImpacted", "Shelters impacted"],
  ["Duration", "Duration (hr)"],
  ["NetRevenue", "Net revenue ($)"],
  ["Expenses", "Expenses ($)"],
  ["CommunitySponsorInvolved", "Community sponsors"],
  ["WaterBottles", "Water bottles"],
  ["SandWichesCount", "Sandwiches"],
  ["CarePackages", "Care packages"],
  ["Clothing", "Clothing items"],
  ["Non-PerishableFood", "Non-perishable food (kg)"],
];

const CATEGORIES = ["Fundraiser", "Direct Relief", "Community Reach", "General/Community"]; // match your Category enum

/**
 * isAdmin  - admin logs are saved as Verified, user logs as Pending
 * clubs    - [{ id, label }] list (admin picks a club)
 * clubId   - the user's own club (ignored for admins)
 */
export default function AddEventModal({ isAdmin, clubs = [], clubId, defaultClubSize = 0, clubMembers = 0, onClose, onSaved }) {
  // Initialize the form for the chosen club and default its member count.
  const [f, setF] = useState({
    EventKinds: "",
    EventDate: "",
    Category: CATEGORIES[0],
    Location: "",
    ClubId: isAdmin ? clubs[0]?.id ?? "" : clubId,
    ...Object.fromEntries(NUM.map(([k]) => [k, 0])),
    ClubSize: clubMembers || defaultClubSize, // from "Total club members" if set, else the last log
  });
  // Keep the submit button state and validation/database error separate.
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Update one controlled form field without replacing the other values.
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  // Validate required details, calculate the score, and save with the correct review status.
  const save = async () => {
    if (!f.EventKinds.trim() || !f.EventDate || !f.Location.trim()) {
      setErr("Enter an event name, date and location.");
      return;
    }
    if (!(Number(f.ClubSize) > 0)) { setErr("Enter how many members the club has. The impact score needs it."); return; }
    if (!f.ClubId) { setErr("No club is linked to this account."); return; }

    setSaving(true); setErr("");
    const { data: u } = await supabase.auth.getUser();

    const row = {
      ...f,
      ...Object.fromEntries(NUM.map(([k]) => [k, Number(f[k]) || 0])),
      CreatedBy: u.user.id,
      Status: isAdmin ? "Verified" : "Pending",
    };
    // stored for convenience; the pages recalculate the score from the raw numbers
    row.ImpactScore = Number(scoreEvent(row).score.toFixed(2));

    const { error } = await supabase.from("EventsActivitiesTable").insert(row);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
    onClose();
  };

  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="md sm" role="dialog" aria-modal="true" aria-label="Add a log">
        {/* Header explains the approval path and exposes the close control. */}
        <div className="mh">
          <div>
            <h2>Add a log</h2>
            <p>{isAdmin ? "Logs added by an admin are verified automatically." : "Your log will be reviewed by an admin before it counts."}</p>
          </div>
          <button className="x" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Event fields are grouped into details and impact numbers. */}
        <div className="mb">
          <div className="fs">
            <div className="t">Event details</div>
            <div className="row r2">
              <div><label>Event name<span className="req">*</span></label>
                <div className="in v"><input value={f.EventKinds} onChange={(e) => set("EventKinds", e.target.value)} /></div></div>
              <div><label>Date<span className="req">*</span></label>
                <div className="in v"><input type="date" value={f.EventDate} onChange={(e) => set("EventDate", e.target.value)} /></div></div>
              <div><label>Category</label>
                <div className="in v"><select value={f.Category} onChange={(e) => set("Category", e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div></div>
              <div><label>Location<span className="req">*</span></label>
                <div className="in v"><input value={f.Location} placeholder="e.g. Downtown Eastside, school gym" onChange={(e) => set("Location", e.target.value)} /></div></div>
              {isAdmin && (
                <div><label>Club</label>
                  <div className="in v"><select value={f.ClubId} onChange={(e) => set("ClubId", e.target.value)}>
                    {clubs.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div></div>
              )}
            </div>
          </div>

          <div className="fs">
            <div className="t">Numbers{clubMembers > 0 && <small>Club size {clubMembers}, from Total club members</small>}</div>
            <div className="row r3">
              {NUM.filter(([k]) => !(k === "ClubSize" && clubMembers > 0)).map(([k, label]) => (
                <div key={k}><label>{label}{k === "ClubSize" && <span className="req">*</span>}</label>
                  <div className="in v"><input type="number" min="0" value={f[k]} onChange={(e) => set(k, e.target.value)} /></div></div>
              ))}
            </div>
          </div>
          {/* Surface validation and save errors beside the form fields. */}
          {err && <p style={{ color: "var(--red)", fontSize: 13, margin: "12px 0 0" }} role="alert">{err}</p>}
        </div>

        {/* Footer shows the resulting status and provides cancel/save actions. */}
        <div className="mf">
          <small>Status on save: <b>{isAdmin ? "Verified" : "Pending"}</b></small>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn pri" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save log"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}