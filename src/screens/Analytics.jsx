import { useState, useMemo } from "react";
import { Tip } from "../components/ui";
import { StatusBadge, STATUS } from "../components/ReviewActions";
import { useOrgEvents, clubLabel } from "../lib/orgEvents";
import { scoreEvent, categoryKey } from "../lib/ImpactScore";
import { seasonOf, seasonLabel, currentSeasonYear, fmt } from "../lib/stats";

const CATS = [
  ["fundraiser", "Fundraiser", "#d4b46e"],
  ["directRelief", "Direct Relief", "#111827"],
  ["general", "General/Community", "#475569"],
];
const MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]; // a season runs Sep to Aug
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const sum = (a) => a.reduce((x, y) => x + y, 0);
const avg = (a) => (a.length ? sum(a) / a.length : null);
// RU = raw units: the physical items delivered, counted one for one (not weighted)
const RAW_ITEMS = ["SandWichesCount", "CarePackages", "Clothing", "WaterBottles"];

/* ---------- Category trajectory: click a point to see every category that month ---------- */
function StepChart({ traj, season }) {
  // The selected month drives the cross-category detail card and guide line.
  const [pop, setPop] = useState(null);
  const x = (i) => 50 + i * 64;
  const y = (v) => 190 - v * 1.6;
  const monthName = (i) => `${MON[MONTHS[i] - 1]} ${MONTHS[i] >= 9 ? season : season + 1}`;

  return (
    <div className="box">
      <div className="leg">{traj.map((s) => <span key={s.k}><i style={{ background: s.color }} />- {s.name}</span>)}</div>
      <div className="scroll">
        <svg viewBox="0 0 820 230" width="100%" style={{ minWidth: 640 }} role="img" aria-label="Category trajectory by month">
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}><line x1="40" x2="810" y1={y(t)} y2={y(t)} stroke="#eceff1" /><text x="8" y={y(t) + 4} fontSize="12" fill="#9ca3af">{t}%</text></g>
          ))}
          {pop !== null && <line x1={x(pop)} x2={x(pop)} y1="20" y2="195" stroke="#d4b46e" strokeDasharray="4 4" />}

          {traj.map((s) => {
            const pts = s.vals.map((v, i) => (v == null ? null : [x(i), y(v), i, v])).filter(Boolean);
            return (
              <g key={s.k}>
                {pts.slice(1).map((p, i) => <line key={i} x1={pts[i][0]} y1={pts[i][1]} x2={p[0]} y2={p[1]} stroke={s.color} strokeWidth="3" />)}
                {pts.map(([px, py, i, v]) => (
                  <circle key={i} className="pt" cx={px} cy={py} r={pop === i ? 8 : 5} fill={s.color}
                    tabIndex={0} role="button" aria-label={`${s.name} ${monthName(i)}: ${v.toFixed(0)}%`}
                    onClick={() => setPop(i)} onKeyDown={(e) => e.key === "Enter" && setPop(i)}>
                    <title>{`${s.name} · ${monthName(i)}: ${v.toFixed(0)}%`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
          {MONTHS.map((m, i) => <text key={m} x={x(i) - 8} y="222" fontSize="12" fill="#9ca3af">{MON[m - 1]}</text>)}
        </svg>
      </div>

      <div className="pickcard" style={{ marginTop: 12 }}>
        {pop === null ? <span>Select a point to see each category's percentage for that month.</span> : (
          <>
            <b>{monthName(pop)}</b>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 6 }}>
              {traj.map((s) => (
                <span key={s.k}><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: s.color, marginRight: 6 }} />
                  {s.name} <b>{s.vals[pop] == null ? "no logs" : `${s.vals[pop].toFixed(0)}%`}</b></span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Grouped bars (each series has its own scale unless max is given) ---------- */
function GroupBars({ groups, series }) {
  // Scale each series independently unless its definition supplies a fixed range.
  const maxes = series.map((s, i) => s.max ?? Math.max(1, ...groups.map((g) => g.values[i] || 0)));
  return (
    <>
      <div className="leg">{series.map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}</div>
      <div className="bars">
        {groups.map((g) => (
          <div className="bg" key={g.label}>
            <div className="pair">
              {series.map((s, i) => {
                const v = g.values[i];
                const label = v == null ? "–" : s.fmt(v);
                return (
                  <div className="bar" key={s.name} data-tip={`${g.label} · ${s.name}: ${label}`}
                    style={{ height: `${Math.max(2, ((v || 0) / maxes[i]) * 100)}%`, background: s.color }}>
                    <em style={{ color: "#475569" }}>{label}</em>
                  </div>
                );
              })}
            </div>
            <small>{g.label}</small>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Analytics() {
  // Organization-wide event stream and the selected season/chart controls.
  const { events, loading, error } = useOrgEvents();
  const [all, setAll] = useState(false);
  const [more, setMore] = useState(false);
  const [picked, setPicked] = useState(null);
  const thisSeason = currentSeasonYear();

  // default to the newest season that has verified logs
  const season = useMemo(() => {
    if (picked !== null) return picked;
    const v = events.filter((e) => e.Status === STATUS.VERIFIED).map((e) => seasonOf(e.EventDate));
    return v.length ? Math.max(...v) : thisSeason;
  }, [picked, events, thisSeason]);
  const seasons = [thisSeason, thisSeason - 1, thisSeason - 2, thisSeason - 3];

  // verified logs in the chosen season, each with its impact score
  // Select verified records for the chosen season and calculate each score once.
  const scored = useMemo(
    () => events.filter((e) => e.Status === STATUS.VERIFIED && seasonOf(e.EventDate) === season).map((e) => ({ e, r: scoreEvent(e) })),
    [events, season]
  );

  // one row per club
  // Aggregate scores, funds, delivered units, reach, and category scores by club.
  const clubs = useMemo(() => {
    const m = new Map();
    scored.forEach((it) => {
      const k = it.e.ClubId ?? clubLabel(it.e);
      const g = m.get(k) || { label: clubLabel(it.e), items: [] };
      g.items.push(it); m.set(k, g);
    });
    return [...m.values()].map((g) => ({
      label: g.label,
      score: avg(g.items.map((i) => i.r.score)),
      funds: sum(g.items.map((i) => Number(i.e.NetRevenue) || 0)),
      ru: sum(g.items.map(({ e }) => RAW_ITEMS.reduce((a, k) => a + (Number(e[k]) || 0), 0))),
      people: sum(g.items.map((i) => Number(i.e.PeopleImpacted) || 0)),
      events: g.items.length,
      byCat: CATS.map(([k]) => avg(g.items.filter((i) => categoryKey(i.e.Category) === k).map((i) => i.r.score))),
    })).sort((a, b) => b.score - a.score);
  }, [scored]);

  // average score per category per month
  // Build monthly category trajectories from the selected season's scores.
  const traj = useMemo(() => CATS.map(([k, name, color]) => ({
    k, name, color,
    vals: MONTHS.map((m) => avg(scored
      .filter(({ e }) => categoryKey(e.Category) === k && Number(String(e.EventDate).slice(5, 7)) === m)
      .map((i) => i.r.score))),
  })), [scored]);

  // newest entries first, every club including HQ
  // Keep the newest organization-wide entries for the activity stream.
  const stream = useMemo(
    () => [...events].sort((a, b) => String(b.CreatedAt).localeCompare(String(a.CreatedAt))).slice(0, more ? 30 : 8),
    [events, more]
  );

  const empty = !loading && !scored.length;

  return (
    <div className="pg">
      {/* Season controls and the club-level performance matrix. */}
      {error && <p style={{ color: "var(--red)" }} role="alert">Could not load analytics: {error.message}. Run analytics.sql in Supabase.</p>}

      <div className="evh">
        <div className="sec" style={{ margin: 0 }} data-tip="Ranks clubs in descending order from highest to lowest overall performance."><h2>Club Performance Matrix</h2></div>
        <select className="sel" aria-label="Season" value={season} onChange={(e) => setPicked(Number(e.target.value))}>
          {seasons.map((y) => <option key={y} value={y}>{seasonLabel(y)}</option>)}
        </select>
      </div>
      <div className="box" style={{ marginTop: 14 }}>
        <div className="scroll">
          <table className="tbl">
            <thead><tr>{["Branch", "Impact Score", "Net Funds", "RU Delivered", "People Impacted", "Events"].map((h) => <th key={h} data-tip={h === "RU Delivered" ? "RU = raw units: sandwiches + care packages + clothing + water bottles delivered" : undefined}>{h}</th>)}</tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6}>Loading…</td></tr>}
              {empty && <tr><td colSpan={6}>No verified logs in {seasonLabel(season)} yet.</td></tr>}
              {(all ? clubs : clubs.slice(0, 4)).map((c, i) => (
                <tr key={c.label}>
                  <td style={{ fontWeight: 600, color: "var(--g)" }}><span className="rank">{i + 1}</span>{c.label}</td>
                  <td>{c.score.toFixed(1)}</td><td>{fmt(c.funds, "money")}</td><td>{Math.round(c.ru).toLocaleString()}</td>
                  <td>{c.people.toLocaleString()}</td><td>{c.events}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {clubs.length > 4 && <Tip className="more" tip={all ? "Show fewer branches" : "Show more branches"} onClick={() => setAll(!all)}>{all ? "↑ View less" : "↓ View more"}</Tip>}
      </div>

      {/* Category score trajectory and its interactive monthly detail. */}
      <div className="sec" data-tip="Average impact score of each category by month. Click a point for every category in that month."><h2>Category Trajectory</h2></div>
      <StepChart traj={traj} season={season} />

      {/* Compare financial/unit output and category efficiency across branches. */}
      <div className="two">
        <div>
          <div className="sec" data-tip="Side-by-side comparison of net funds raised and goods delivered (raw units)."><h2>Financial &amp; Unit Output</h2></div>
          <div className="box">
            <p className="sub" style={{ fontSize: 14 }}>Net Funds &amp; RU Delivered by branch · {seasonLabel(season)}</p>
            {empty ? <p className="sub">No verified logs yet.</p> : (
              <GroupBars groups={clubs.map((c) => ({ label: c.label, values: [c.funds, c.ru] }))}
                series={[{ name: "Net Funds", color: "#3d6640", fmt: (v) => fmt(v, "money") }, { name: "RU Delivered", color: "#111827", fmt: (v) => fmt(Math.round(v)) }]} />
            )}
          </div>
        </div>
        <div>
          <div className="sec" data-tip="Average impact score for each branch, split by event category. Scores already account for club size and location difficulty."><h2>Cross-Branch Performance &amp; Efficiency Matrix</h2></div>
          <div className="box">
            <p className="sub" style={{ fontSize: 14 }}>Impact score by branch and category · {seasonLabel(season)}</p>
            {empty ? <p className="sub">No verified logs yet.</p> : (
              <GroupBars groups={clubs.map((c) => ({ label: c.label, values: c.byCat }))}
                series={CATS.map(([, name, color]) => ({ name, color, max: 100, fmt: (v) => v.toFixed(0) }))} />
            )}
          </div>
        </div>
      </div>

      {/* Latest entries from all clubs, with review status and expandable history. */}
      <div className="sec" data-tip="Newest entries from every club, including HQ. Updates when logs are added or reviewed."><h2>Activity Stream</h2></div>
      <div className="box scroll">
        <table className="tbl">
          <thead><tr>{["Date", "Branch", "Event", "Type", "Status"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {!loading && !stream.length && <tr><td colSpan={5}>No activity yet.</td></tr>}
            {stream.map((e) => (
              <tr key={e.id}>
                <td style={{ color: "var(--g)" }}>{String(e.EventDate).slice(0, 10)}</td>
                <td>{clubLabel(e)}</td><td>{e.EventKinds}</td><td>{e.Category}</td><td><StatusBadge status={e.Status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length > 8 && <Tip className="more" tip="Show more activity" onClick={() => setMore(!more)}>{more ? "↑ View less" : "↓ View more"}</Tip>}
      </div>

      <div className="foot"><a href="https://docs.google.com/document/d/1g2KzU3-6VUcqWvgcZ-1LPFtXL5M6dhOztJUhu5BFGdo/edit?usp=sharing" target="_blank" rel="noreferrer">Impact Score Derivation &amp; Dashboard Details</a></div>
    </div>
  );
}