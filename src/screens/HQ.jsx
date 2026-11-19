import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Tip } from "../components/ui";
import AddEventModal from "../components/AddEventModal";
import ReviewActions, { StatusBadge, STATUS } from "../components/ReviewActions";
import History from "../components/History";
import FinanceByYear from "../components/FinanceByYear";

const money = (v) => `$${Number(v || 0).toLocaleString()}`;
const PAGE = 8;
const STATUS_FILTERS = ["All", STATUS.PENDING, STATUS.CLARIFY, STATUS.VERIFIED];

/**
 * isAdmin      admins add logs for any club and verify; users see a read-only list
 * clubRows     [{ id, ClubName, label }]
 * myClubId     the signed-in user's own club (users only see this club's logs)
 */
export default function HQ({ isAdmin = false, clubRows = [], myClubId = null }) {
  // Event data, clarification notes, pagination, and financial season settings.
  const [events, setEvents] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [adding, setAdding] = useState(false);
  const [flt, setFlt] = useState("All");
  const [page, setPage] = useState(1);
  const [seasonRows, setSeasonRows] = useState([]);

  // Increment this key after review actions to reload the latest rows.
  const reload = () => setTick((t) => t + 1);
  // Resolve a club id to its visible label for finance records.
  const clubName = (id) => {
    const c = clubRows.find((c) => c.id === id);
    return c?.label ?? c?.ClubName ?? "—";
  };

  // Load all event rows, season balances, and latest clarification comments.
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("EventsActivitiesTable").select("*").order("EventDate", { ascending: false });
      if (!alive) return;
      if (error || !data) { console.log("HQ events error:", error); setEvents([]); setLoading(false); return; }
      setEvents(data); setLoading(false);

      const { data: sr } = await supabase.from("ClubSeasons").select("ClubId, SeasonStart, StartingBalance");
      if (alive) setSeasonRows(sr || []);

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
  }, [tick]);

  // Users only see their own club; admins see everything.
  const visible = isAdmin || !myClubId ? events : events.filter((e) => e.ClubId === myClubId);

  // Apply the selected status filter before deriving the visible page.
  const rows = visible.filter((e) => flt === "All" || e.Status === flt);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * PAGE, cur * PAGE);

  const cols = ["Event", "Date", "Club", "Category", "Net Revenue", "Expenses", "Volunteers", "People Impacted", "Shelters Impacted", "Care Packages", "Sandwiches", "Water Bottles", "Volunteer Hours", "Duration (hr)", "Location", isAdmin ? "Change Status" : "Status"];

  return (
    <div className="pg">
      {/* HQ-wide financial rollup and reviewable event log. */}
      <h1 className="h2">Event Logger</h1>
      <p className="sub">{isAdmin ? "Review HQ events, verify submissions, and monitor operational performance." : "Read-only view. Only admins can add or verify logs here."}</p>

      <FinanceByYear events={visible} seasonRows={seasonRows} clubName={clubName} />

      <div className="box" style={{ borderRadius: 18 }}>
        <div className="evh">
          <div><h3>Event Log</h3><p>{isAdmin ? "Add logs for any club. Verify or request clarification on each row." : "Logs for your club."}</p></div>
          <div className="tools">
            <select className="sel" style={{ padding: "8px 14px", fontSize: 13 }} aria-label="Status filter" value={flt} onChange={(e) => { setFlt(e.target.value); setPage(1); }}>
              {STATUS_FILTERS.map((s) => <option key={s}>{s}</option>)}
            </select>
            {isAdmin && <Tip className="btn pri" tip={clubRows.length ? "Add a log for any club (saved as Verified)" : "No clubs loaded yet"} onClick={() => setAdding(true)} disabled={!clubRows.length}>＋ Add event</Tip>}
          </div>
        </div>

        <div className="scroll">
          <table className="tbl ev" style={{ minWidth: 1200 }}>
            <thead><tr>{cols.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {loading && <tr><td colSpan={cols.length}>Loading logs…</td></tr>}
              {!loading && !shown.length && <tr><td colSpan={cols.length}>{visible.length ? "No logs match this filter." : "No logs yet."}</td></tr>}
              {shown.map((r) => (
                <tr key={r.id} style={{ cursor: "default" }}>
                  <td><b>{r.EventKinds}</b></td>
                  <td>{String(r.EventDate).replaceAll("-", "/")}</td>
                  <td>{clubName(r.ClubId)}</td>
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
                    {isAdmin && <div style={{ marginTop: 8 }}><ReviewActions event={r} onDone={reload} /></div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pgn">
          <span>Showing {rows.length ? `${(cur - 1) * PAGE + 1}-${Math.min(cur * PAGE, rows.length)}` : 0} of {rows.length} events</span>
          <div>
            <button className="btn" disabled={cur === 1} onClick={() => setPage(cur - 1)}>Previous</button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map((n) => <button key={n} className={`btn ${n === cur ? "on" : ""}`} onClick={() => setPage(n)}>{n}</button>)}
            {pages > 7 && <span>…</span>}
            <button className="btn" disabled={cur === pages} onClick={() => setPage(cur + 1)}>Next</button>
          </div>
        </div>
      </div>

      <History events={visible} className="hist" style={{ marginTop: 22, borderRadius: 18 }} />

      {adding && <AddEventModal isAdmin clubs={clubRows} onClose={() => setAdding(false)} onSaved={reload} />}
    </div>
  );
}