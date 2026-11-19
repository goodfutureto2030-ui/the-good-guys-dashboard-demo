import { useState, useEffect, useMemo } from "react";
import { Tip } from "../components/ui";
import { supabase } from "../lib/supabase";
import AddEventModal from "../components/AddEventModal";
import { StatusBadge, STATUS } from "../components/ReviewActions";
import History from "../components/History";
import FinanceByYear from "../components/FinanceByYear";
import ClubMembers from "../components/ClubMembers";
import { useOrgEvents } from "../lib/orgEvents";
import { scoreEvent, summarize, performanceLabel } from "../lib/ImpactScore";

const money = (v) => `$${Number(v || 0).toLocaleString()}`;
const NEXT_FILTER = {
  All: STATUS.VERIFIED,
  [STATUS.VERIFIED]: STATUS.PENDING,
  [STATUS.PENDING]: STATUS.CLARIFY,
  [STATUS.CLARIFY]: "All",
};
const COLS = [
  "Event", "Date", "Category", "Net Revenue", "Expenses", "Volunteers", "People Impacted", "Shelters Impacted",
  "Care Packages", "Sandwiches", "Water Bottles", "Volunteer Hours", "Duration (hr)", "Location", "Status", "Impact Score",
];

/**
 * isAdmin, myClubId (user's own club), clubRows ([{id,label}]),
 * director (name shown in the first card, optional)
 */
export default function ClubLog({
  clubs, sel, setSel, onAddClub, onEditClub,
  isAdmin = false, myClubId = null, clubRows = [], director = "",
}) {
  // Search/filter controls and the selected-club event list.
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState("All");
  const [adding, setAdding] = useState(false);
  const [events, setEvents] = useState([]);
  const [notes, setNotes] = useState({});          // EventId -> latest clarification comment
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [yearPick, setYearPick] = useState(null);   // scatter year
  const [pickedId, setPickedId] = useState(null);   // clicked bubble
  const [seasonRows, setSeasonRows] = useState([]); // starting balances per season
  const [members, setMembers] = useState(null);     // total club members
  const [scope, setScope] = useState("club");       // scatter: this club or every club
  const { events: orgEvents } = useOrgEvents();

  // Admin-only follow-up notes and their input/error state.
  const [adminNotes, setAdminNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [noteErr, setNoteErr] = useState("");

  // admins view the selected club; users are limited to their club by the database
  // Resolve the active club id according to the viewer's role.
  const clubId = isAdmin ? clubRows.find((c) => c.label === sel)?.id : null;
  const ownClubId = isAdmin ? clubId : myClubId;   // the club whose members / balance can be edited
  const noteClub = clubId ?? null;

  /* ---------- load logs, balances and member count ---------- */
  // Reload selected-club records and supporting metadata when the selection changes.
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      let query = supabase.from("EventsActivitiesTable").select("*").order("EventDate", { ascending: false });
      if (clubId) query = query.eq("ClubId", clubId);
      const { data, error } = await query;
      if (!alive) return;
      if (error) { console.log("events error:", error); setEvents([]); setLoading(false); return; }
      setEvents(data); setLoading(false);

      let sq = supabase.from("ClubSeasons").select("ClubId, SeasonStart, StartingBalance");
      if (clubId) sq = sq.eq("ClubId", clubId);
      const { data: sr } = await sq;
      const { data: cm } = await supabase.rpc("club_members");
      if (alive) {
        setSeasonRows(sr || []);
        setMembers((cm || []).find((c) => c.club_id === ownClubId)?.members ?? null);
      }

      const ids = data.filter((e) => e.Status === STATUS.CLARIFY).map((e) => e.id);
      if (!ids.length) { setNotes({}); return; }
      const { data: cs } = await supabase.from("EventComments").select("EventId, Comment, CreatedAt")
        .in("EventId", ids).order("CreatedAt", { ascending: false });
      if (!alive) return;
      const latest = {};
      (cs || []).forEach((c) => { if (!latest[c.EventId]) latest[c.EventId] = c.Comment; });
      setNotes(latest);
    })();
    return () => { alive = false; };
  }, [clubId, ownClubId, tick]);

  /* ---------- admin notes ---------- */
  // Load notes scoped to the selected club, or global notes at HQ level.
  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    (async () => {
      let q2 = supabase.from("AdminNotes").select("*").order("CreatedAt", { ascending: false });
      q2 = noteClub ? q2.eq("ClubId", noteClub) : q2.is("ClubId", null);
      const { data, error } = await q2;
      if (!alive) return;
      if (error) { setNoteErr(error.message); return; }
      setAdminNotes(data); setNoteErr("");
    })();
    return () => { alive = false; };
  }, [isAdmin, noteClub]);

  // Create a non-empty follow-up note and update the local list on success.
  const addNote = async () => {
    const text = noteText.trim();
    if (!text) return;
    const { data, error } = await supabase.from("AdminNotes").insert({ ClubId: noteClub, Note: text }).select().single();
    if (error) return setNoteErr(error.message);
    setAdminNotes([data, ...adminNotes]); setNoteText(""); setNoteErr("");
  };
  // Toggle completion state while keeping the visible notes synchronized.
  const toggleNote = async (n) => {
    const { error } = await supabase.from("AdminNotes").update({ Done: !n.Done }).eq("id", n.id);
    if (error) return setNoteErr(error.message);
    setAdminNotes(adminNotes.map((x) => (x.id === n.id ? { ...x, Done: !x.Done } : x)));
  };
  // Remove a note from storage and the current view.
  const removeNote = async (n) => {
    const { error } = await supabase.from("AdminNotes").delete().eq("id", n.id);
    if (error) return setNoteErr(error.message);
    setAdminNotes(adminNotes.filter((x) => x.id !== n.id));
  };

  /* ---------- numbers: the club's member count decides its size in the score ---------- */
  // Apply the shared club size to each log before scoring.
  const sized = useMemo(() => (members ? events.map((e) => ({ ...e, ClubSize: members })) : events), [events, members]);
  const results = useMemo(() => Object.fromEntries(sized.map((e) => [e.id, scoreEvent(e)])), [sized]);
  const verified = useMemo(() => events.filter((e) => e.Status === STATUS.VERIFIED), [events]);
  const summary = useMemo(
    () => (verified.length ? summarize(verified.map((e) => results[e.id])) : null),
    [verified, results]
  );
  const sum = (list, k) => list.reduce((a, e) => a + (Number(e[k]) || 0), 0);

  // Filter the log table and derive a concise score explanation.
  const rows = events.filter((r) =>
    (flt === "All" || r.Status === flt) &&
    `${r.EventKinds} ${r.Category} ${r.Location}`.toLowerCase().includes(q.toLowerCase()));

  const tip = useMemo(() => {
    if (!summary) return null;
    const used = summary.dims.filter((d) => d.used > 0);
    if (!used.length) return null;
    const top = [...used].sort((a, b) => b.pts - a.pts)[0];
    const low = [...used].sort((a, b) => a.sub - b.sub)[0];
    return `${top.label} is driving the largest share of this score (${top.pts.toFixed(1)} pts). ${low.label} is the biggest opportunity to improve it further (it scores ${low.sub.toFixed(0)}/100 on its own).`;
  }, [summary]);

  /* ---------- scatter: this club or every club, by year, clickable bubbles ---------- */
  // Select the scatter plot's event pool and derive scales, coordinates, and status colors.
  const pool = scope === "all" && orgEvents.length ? orgEvents : sized;
  const poolScores = useMemo(() => Object.fromEntries(pool.map((e) => [e.id, scoreEvent(e)])), [pool]);
  const years = useMemo(() => [...new Set(pool.map((e) => String(e.EventDate).slice(0, 4)))].sort().reverse(), [pool]);
  const year = yearPick ?? years[0] ?? String(new Date().getFullYear());
  const dots = pool.filter((e) => year === "all" || String(e.EventDate).slice(0, 4) === year);
  const maxVol = Math.max(10, ...dots.map((e) => Number(e.Volunteers) || 0));
  const cx = (v) => 36 + (v / maxVol) * 340;
  const cy = (s) => 205 - (s / 100) * 180;
  const rad = (d) => 6 + Math.min(10, (Number(d) || 0) * 1.5);
  const dotFill = (e) =>
    scope === "all" && ownClubId && e.ClubId !== ownClubId ? "#b9c4cf" : e.Status === STATUS.VERIFIED ? "#2D6438" : "#d4b46e";
  const picked = dots.find((e) => e.id === pickedId);

  return (
    <div className="pg">
      {/* Club selection and role-gated actions. */}
      <div className="ctl">
        {/* admins can switch clubs; users are locked to their own club */}
        <select className="sel" aria-label="Club" value={sel} onChange={(e) => setSel(e.target.value)} disabled={!isAdmin}>
          {clubs.map((c) => <option key={c}>{c}</option>)}
        </select>
        {isAdmin && onEditClub && <Tip className="btn" tip="Edit this club's details" onClick={onEditClub}>Edit this club</Tip>}
        {isAdmin && onAddClub && <Tip className="btn" tip="Register a new club" onClick={onAddClub}>＋ Add a club</Tip>}
      </div>

      <h1 className="h2" style={{ fontSize: 24 }}>Event Logger · {sel}</h1>
      <p className="sub" style={{ fontSize: 13 }}>
        {isAdmin ? "Admin view for reviewing, comparing, and coaching club performance" : "Your club's events and performance this season"}
      </p>

      {/* Club profile metrics and its seasonal finance breakdown. */}
      <div className="k4">
        <div className="kc">
          <span className="kp">Director(s):</span>
          <b>{director || "—"}</b>
          {isAdmin && onEditClub && <button className="btn" style={{ padding: "6px 12px", fontSize: 13 }} onClick={onEditClub}>Assign directors</button>}
          <p>Primary reviewer for this club log</p>
        </div>
        <ClubMembers clubId={ownClubId} members={members} onSaved={() => setTick((t) => t + 1)} />
        {[
          ["People Impacted", sum(verified, "PeopleImpacted").toLocaleString(), "Total estimated number of unique individuals who received direct aid, services, or attendance benefit during verified events."],
          ["Avg Impact Score", summary ? `${summary.score.toFixed(1)} / 100` : "—", summary ? performanceLabel(summary.score) : "Appears once a log is verified"],
        ].map(([l, v, d]) => <div className="kc" key={l}><span className="kp">{l}</span><b>{v}</b><p>{d}</p></div>)}
      </div>

      <FinanceByYear events={events} seasonRows={seasonRows} clubId={ownClubId} canEdit={!!ownClubId}
        onSaved={() => setTick((t) => t + 1)} />

      {/* Searchable event table with review statuses and impact scores. */}
      <div className="box" style={{ borderRadius: 18 }}>
        <div className="evh"><div><h3>Event Log</h3></div>
          <div className="tools">
            {!isAdmin && <Tip className="btn pri" tip="Log a new event for your club" onClick={() => setAdding(true)}>＋ Add event</Tip>}
            <label className="btn" style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400 }}>🔍<input placeholder="Search events" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search events" /></label>
            <Tip className="btn" tip={`Status filter: ${flt} (click for ${NEXT_FILTER[flt]})`} onClick={() => setFlt(NEXT_FILTER[flt])}>⛉ Filters{flt !== "All" ? `: ${flt}` : ""}</Tip>
          </div>
        </div>
        <div className="scroll">
          <table className="tbl ev" style={{ minWidth: 1300 }}>
            <thead><tr>{COLS.map((h) => <th key={h}>{h}<span>▾</span></th>)}</tr></thead>
            <tbody>
              {loading && <tr><td colSpan={COLS.length}>Loading logs…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={COLS.length}>{events.length === 0 ? (isAdmin ? "No logs for this club yet." : "No logs yet. Use “Add event” to create your first one.") : "No logs match this filter."}</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.EventKinds}</b></td>
                  <td>{String(r.EventDate).replaceAll("-", "/")}</td>
                  <td>{r.Category}</td>
                  <td><b>{money(r.NetRevenue)}</b></td>
                  <td>{money(r.Expenses)}</td>
                  <td>{r.Volunteers}</td>
                  <td>{r.PeopleImpacted}</td>
                  <td>{r.SheltersImpacted}</td>
                  <td>{r.CarePackages}</td>
                  <td>{r.SandWichesCount}</td>
                  <td>{r.WaterBottles}</td>
                  <td>{r.VolunteerHour}</td>
                  <td>{r.Duration}</td>
                  <td>{r.Location}</td>
                  <td>
                    <StatusBadge status={r.Status} />
                    {r.Status === STATUS.CLARIFY && notes[r.id] && <small className="sc" style={{ maxWidth: 200, whiteSpace: "normal" }}>Admin: {notes[r.id]}</small>}
                  </td>
                  <td><b>{results[r.id].score.toFixed(1)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pgn">
          <span>Showing {rows.length ? `1-${rows.length}` : 0} of {events.length} events</span>
        </div>
      </div>

      {/* Score decomposition and administrator follow-up notes. */}
      <div className="cl2">
        <div>
          {/* Interactive volunteer/impact scatter plot with event details. */}
          <div className="box" style={{ borderRadius: 14 }}>
            <h3 style={{ margin: 0, color: "var(--g)" }} data-tip="Composite feedback on overall event quality and efficiency, from verified logs"> Feedback</h3>
            <div className="score">
              <span style={{ fontSize: 13 }}>Standardized Impact Score</span>
              <b>{summary ? `${summary.score.toFixed(1)} / 100` : "— / 100"}</b>
              <small>{summary ? `Based on ${summary.n} verified log${summary.n === 1 ? "" : "s"}` : "No verified logs yet"}</small>
              {summary && <small style={{ fontWeight: 700 }}>{performanceLabel(summary.score)}</small>}
            </div>
            <b style={{ color: "var(--g)", fontSize: 14 }}>Sub-Score Decomposition</b>
            {(summary ? summary.dims : []).map((d) => (
              <div key={d.key}>
                <div className="sub-r"><span>{d.label}</span><span>{d.pts.toFixed(1)} pts</span></div>
                <div className="sub-b" data-tip={`${d.label}: ${d.pts.toFixed(1)} pts · sub-score ${d.sub.toFixed(0)}/100`}
                  style={{ width: `${Math.max(2, Math.min(100, d.sub))}%`, background: d.color }} />
              </div>
            ))}
            {tip && <div className="tipbox">💡 {tip}</div>}
          </div>

          {isAdmin && (
            <div className="box" style={{ borderRadius: 14, marginTop: 24 }}>
              <h3 style={{ margin: 0, color: "var(--g)" }}>Admin Notes</h3>
              <p className="sub" style={{ fontSize: 13 }}>Quick actions and follow-up items for this club log</p>
              {!adminNotes.length && <p className="sub" style={{ fontSize: 13 }}>No notes yet.</p>}
              {adminNotes.map((n) => (
                <div className="chk" key={n.id}>
                  <button type="button" className="nbtn" onClick={() => toggleNote(n)} aria-label={n.Done ? "Mark as not done" : "Mark as done"}>{n.Done ? "✔" : "○"}</button>
                  <span style={{ flex: 1, ...(n.Done ? { textDecoration: "line-through", color: "#9ca3af" } : null) }}>{n.Note}</span>
                  <button type="button" className="nbtn" onClick={() => removeNote(n)} aria-label="Delete note">×</button>
                </div>
              ))}
              <div className="note-add">
                <input value={noteText} placeholder="Write a follow-up note…" aria-label="New admin note"
                  onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} />
              </div>
              <Tip className="addb" tip="Save this note" onClick={addNote}>✉ ADD</Tip>
              {noteErr && <p style={{ color: "var(--red)", fontSize: 12 }} role="alert">{noteErr}</p>}
            </div>
          )}
        </div>

        <div>
          <div className="box" style={{ borderRadius: 14 }}>
            <div className="evh">
              <div><h3 style={{ margin: 0, color: "var(--g)" }} data-tip="Does more volunteer deployment lead to more impact? Click a bubble for details.">Efficiency Scatter - Volunteers vs. Impact Score</h3></div>
              <div className="tools">
                <select className="sel" style={{ padding: "6px 12px", fontSize: 12 }} aria-label="Clubs shown" value={scope}
                  onChange={(e) => { setScope(e.target.value); setYearPick(null); setPickedId(null); }}>
                  <option value="club">This club</option>
                  <option value="all">All clubs</option>
                </select>
                <select className="sel" style={{ padding: "6px 12px", fontSize: 12 }} aria-label="Year" value={year}
                  onChange={(e) => { setYearPick(e.target.value); setPickedId(null); }}>
                  {years.length ? years.map((y) => <option key={y} value={y}>{y}</option>) : <option value={year}>{year}</option>}
                  <option value="all">All years</option>
                </select>
              </div>
            </div>
            <svg viewBox="0 0 400 230" width="100%" role="img" aria-label="Volunteers vs impact score" style={{ marginTop: 10 }}>
              <rect x="0.5" y="0.5" width="399" height="229" rx="6" fill="none" stroke="#e5e7eb" />
              {[0, 50, 100].map((t) => <g key={t}><line x1="32" x2="392" y1={cy(t)} y2={cy(t)} stroke="#f0f2f4" /><text x="6" y={cy(t) + 3} fontSize="9" fill="#9ca3af">{t}</text></g>)}
              <text x="36" y="224" fontSize="9" fill="#9ca3af">0</text>
              <text x="376" y="224" fontSize="9" fill="#9ca3af" textAnchor="end">{maxVol} volunteers</text>
              {dots.map((e) => (
                <circle key={e.id} className="dot" cx={cx(Number(e.Volunteers) || 0)} cy={cy(poolScores[e.id].score)} r={pickedId === e.id ? rad(e.Duration) + 3 : rad(e.Duration)}
                  fill={dotFill(e)} fillOpacity=".75" stroke={pickedId === e.id ? "#111827" : "#fff"} strokeWidth={pickedId === e.id ? 2 : 1}
                  tabIndex={0} role="button" aria-label={`${e.EventKinds}: ${e.Volunteers} volunteers, impact score ${poolScores[e.id].score.toFixed(1)}`}
                  onClick={() => setPickedId(e.id)} onKeyDown={(ev) => ev.key === "Enter" && setPickedId(e.id)}>
                  <title>{e.EventKinds}</title>
                </circle>
              ))}
              {!dots.length && <text x="200" y="120" fontSize="11" fill="#9ca3af" textAnchor="middle">No logs in {year === "all" ? "any year" : year}</text>}
            </svg>
            <p className="sub" style={{ fontSize: 11, margin: "6px 0 0" }}>
              {dots.length} log{dots.length === 1 ? "" : "s"} shown · bubble size = event duration · green = verified, gold = waiting{scope === "all" ? ", light = other clubs" : ""}
            </p>
            <div className="pickcard" style={{ marginTop: 10 }}>
              {picked ? (
                <>
                  <b>{picked.EventKinds}</b>
                  <div style={{ marginTop: 4 }}>Volunteers: <b>{picked.Volunteers}</b> · Impact score: <b>{poolScores[picked.id].score.toFixed(1)}</b> / 100</div>
                  <small>{picked.ClubName ? `${picked.ClubName} · ` : ""}{String(picked.EventDate).replaceAll("-", "/")} · {picked.Category} · <StatusBadge status={picked.Status} /></small>
                </>
              ) : <span>Click a bubble to see the event name, volunteers and impact score.</span>}
            </div>
          </div>

          <History events={events} style={{ marginTop: 24 }} />
        </div>
      </div>

      {/* Only club users create event logs from this screen. */}
      {adding && (
        <AddEventModal isAdmin={false} clubId={myClubId} clubMembers={members || 0}
          defaultClubSize={Number(events[0]?.ClubSize) || 0}
          onClose={() => setAdding(false)} onSaved={() => setTick((t) => t + 1)} />
      )}
    </div>
  );
}