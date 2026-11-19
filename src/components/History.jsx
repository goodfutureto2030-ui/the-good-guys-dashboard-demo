import { STATUS } from "./ReviewActions";

/* Historical performance, built from the event log.
   Bars  = people impacted per calendar year (Verified logs only)
   Totals = every log in the list you pass in                         */
export default function History({ events = [], className = "", style = {} }) {
  // Use a rolling six-calendar-year window for the impact bars.
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => thisYear - 5 + i);

  // Each year reports verified event count and total people impacted.
  const perYear = years.map((y) => {
    const ev = events.filter((e) => e.Status === STATUS.VERIFIED && String(e.EventDate).slice(0, 4) === String(y));
    return { y, n: ev.length, people: ev.reduce((a, e) => a + (Number(e.PeopleImpacted) || 0), 0) };
  });
  // Keep the bar scale nonzero so an empty history still renders safely.
  const max = Math.max(1, ...perYear.map((p) => p.people));

  // Summary counters separate verified work from logs awaiting review.
  const verified = events.filter((e) => e.Status === STATUS.VERIFIED).length;
  const waiting = events.filter((e) => e.Status === STATUS.PENDING || e.Status === STATUS.CLARIFY).length;

  return (
    <div className={`box ${className}`} style={{ borderRadius: 14, ...style }}>
      {/* Chart title, year range, and explanatory legend. */}
      <div className="evh">
        <h3 className="h2" style={{ fontSize: 20 }} data-tip="Multi-year progression in total impact, built from the event log.">Historical performance</h3>
        <span className="chip" style={{ background: "var(--g)", color: "#fff", fontSize: 12 }}>Last 6 years</span>
      </div>
      <p className="sub" style={{ fontSize: 12, margin: "6px 0 0" }}>Bars show people impacted per year (verified logs).</p>

      {/* Bar heights are normalized to the largest annual people total. */}
      <div className="hbars" style={{ marginTop: 14 }}>
        {perYear.map((p) => (
          <div key={p.y} style={{ height: `${Math.max(3, (p.people / max) * 100)}%` }}
            data-tip={`${p.y}: ${p.n} verified events · ${p.people.toLocaleString()} people`} />
        ))}
      </div>
      <div className="yrs">{years.map((y) => <span key={y}>{y}</span>)}</div>

      {/* Counts include the entire supplied event list, including pending logs. */}
      <div className="sm3">
        <div><span>Total events</span><b>{events.length}</b></div>
        <div><span>Verified</span><b>{verified}</b></div>
        <div><span>Waiting</span><b>{waiting}</b></div>
      </div>
    </div>
  );
}