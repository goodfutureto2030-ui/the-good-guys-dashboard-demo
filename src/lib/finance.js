import { STATUS } from "../components/ReviewActions";
import { seasonOf } from "./stats";

/* One row per season (Sep to Aug), oldest first.
   start  = the balance an admin entered for that season, otherwise last season's ending balance
   net    = NetRevenue of Verified logs (income after expenses)
   gross  = net + expenses
   end    = start + net                                                                      */
export function buildSeasonTable(events, seasonRows, thisSeason) {
  // Financial summaries include verified event logs only.
  const verified = events.filter((e) => e.Status === STATUS.VERIFIED);

  // entered starting balances per season (summed when several clubs are shown)
  // SeasonStart may be a year (2025) or a date ("2025-09-01"): read the first 4 characters either way
  const stored = {};
  seasonRows.forEach((r) => {
    if (r.StartingBalance === null || r.StartingBalance === undefined) return;
    const s = Number(String(r.SeasonStart).slice(0, 4));
    if (!Number.isFinite(s)) return; // skip rows with an unreadable season
    stored[s] = (stored[s] || 0) + Number(r.StartingBalance);
  });

  const years = [thisSeason, ...Object.keys(stored).map(Number), ...verified.map((e) => seasonOf(e.EventDate))]
    .filter(Number.isFinite); // a stray NaN would make min/max NaN and the table empty
  const min = Math.min(...years);
  const max = Math.max(...years);

  const rows = [];
  let prevEnd = null;
  // Build seasons chronologically so missing starting balances can roll forward.
  for (let s = min; s <= max; s++) {
    const evs = verified.filter((e) => seasonOf(e.EventDate) === s);
    const net = evs.reduce((a, e) => a + (Number(e.NetRevenue) || 0), 0);
    const exp = evs.reduce((a, e) => a + (Number(e.Expenses) || 0), 0);
    const has = s in stored;
    const start = has ? stored[s] : (prevEnd ?? 0);
    const source = has ? "entered" : prevEnd !== null ? "rolled" : "none";
    const end = start + net;
    rows.push({ s, start, source, net, exp, gross: net + exp, end, n: evs.length });
    prevEnd = end;
  }
  return rows;
}