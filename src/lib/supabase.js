// In-memory fake: same interface as the Supabase client, no network, resets on refresh.
// Must match the STATUS values in components/ReviewActions.jsx
const V = "Verified", P = "Pending", C = "Needs clarification";

const ev = (id, ClubId, EventKinds, Category, EventDate, o = {}) => ({
  id, ClubId, EventKinds, Category, EventDate,
  CreatedAt: `${EventDate}T12:00:00Z`,
  NetRevenue: 0, Expenses: 0, Volunteers: 0, PeopleImpacted: 0, SheltersImpacted: 0,
  CarePackages: 0, SandWichesCount: 0, WaterBottles: 0, Clothing: 0,
  VolunteerHour: 0, Duration: 2, Location: "Community Hall", ClubSize: 20, Status: V, ...o,
});

const seed = {
  Profile: [
    { id: "demo-admin", Role: "Admin", ClubId: null },
    { id: "demo-user", Role: "User", ClubId: 1 },
  ],
  Clubs: [
    { id: 1, ClubName: "A - Harbourview", loc: "Harbourview", director: "Alex Demo", year: "2025/2026", balance: "8400" },
    { id: 2, ClubName: "B - Northgate", loc: "Northgate", director: "Sam Sample", year: "2025/2026", balance: "5200" },
    { id: 3, ClubName: "C - Eastside", loc: "Eastside", director: "Jo Example", year: "2025/2026", balance: "6100" },
    { id: 4, ClubName: "D - Riverside", loc: "Riverside", director: "Chris Test", year: "2025/2026", balance: "4300" },
  ],
  // SeasonStart is a plain year (the season starting in September of that year)
  ClubSeasons: [1, 2, 3, 4].flatMap((ClubId) => [
    { ClubId, SeasonStart: 2025, StartingBalance: 3000 + ClubId * 500 },
    { ClubId, SeasonStart: 2026, StartingBalance: 4000 + ClubId * 500 },
  ]),
  // Goals.jsx filters on PeriodStart. The metric columns are still missing:
  // paste lib/stats.js and I will add the real column names so the numbers show.
  Goals: [
    { id: 1, PeriodStart: "2026-01-01" },
  ],
  AdminNotes: [],
  EventComments: [
    { EventId: 9, Comment: "Please confirm the expense total.", CreatedAt: "2026-11-02T10:00:00Z" },
  ],
  EventsActivitiesTable: [
    ev(1, 1, "Bake Sale", "Fundraiser", "2025-10-12", { NetRevenue: 1240, Expenses: 180, Volunteers: 12, PeopleImpacted: 310, VolunteerHour: 36 }),
    ev(2, 1, "Sandwich Drive", "Direct Relief", "2025-11-20", { SandWichesCount: 400, Volunteers: 15, PeopleImpacted: 400, VolunteerHour: 45 }),
    ev(3, 2, "Winter Bottle Drive", "Fundraiser", "2025-12-05", { NetRevenue: 772, Expenses: 90, Volunteers: 8, PeopleImpacted: 150, VolunteerHour: 20 }),
    ev(4, 3, "Care Packages", "Direct Relief", "2026-01-18", { CarePackages: 120, SheltersImpacted: 3, Volunteers: 14, PeopleImpacted: 240, VolunteerHour: 40 }),
    ev(5, 4, "Garden Setup", "General/Community", "2026-02-09", { Volunteers: 20, PeopleImpacted: 90, VolunteerHour: 60, Duration: 4 }),
    ev(6, 2, "Clothing Drive", "Direct Relief", "2026-03-14", { Clothing: 210, Volunteers: 10, PeopleImpacted: 180, VolunteerHour: 25 }),
    ev(7, 1, "Gala Night", "Fundraiser", "2026-04-22", { NetRevenue: 1860, Expenses: 700, Volunteers: 18, PeopleImpacted: 520, VolunteerHour: 54, Duration: 4 }),
    ev(8, 3, "Water Bottle Drive", "Direct Relief", "2026-05-04", { WaterBottles: 300, Volunteers: 9, PeopleImpacted: 260, VolunteerHour: 18 }),
    ev(9, 4, "Fall Food Drive", "Direct Relief", "2026-09-28", { SandWichesCount: 250, Volunteers: 11, PeopleImpacted: 220, VolunteerHour: 30, Status: C }),
    ev(10, 2, "Annual Fundraiser", "Fundraiser", "2026-10-03", { NetRevenue: 980, Expenses: 210, Volunteers: 13, PeopleImpacted: 280, VolunteerHour: 39 }),
    ev(11, 1, "Shelter Meal Program", "Direct Relief", "2026-10-30", { SandWichesCount: 350, SheltersImpacted: 2, Volunteers: 16, PeopleImpacted: 340, VolunteerHour: 48 }),
    ev(12, 3, "Community Cleanup", "General/Community", "2026-11-08", { Volunteers: 22, PeopleImpacted: 120, VolunteerHour: 66, Duration: 3 }),
    ev(13, 1, "Nov Fundraising", "Fundraiser", "2026-11-14", { NetRevenue: 640, Expenses: 80, Volunteers: 7, PeopleImpacted: 130, VolunteerHour: 14, Status: P }),
  ],
};

const db = JSON.parse(JSON.stringify(seed));
const memberCounts = {}; // clubId -> members, so edits in the demo stick until refresh
const newId = () => Date.now() + Math.floor(Math.random() * 1000);

class Query {
  constructor(table) {
    this.table = table; this.op = "select"; this.filters = [];
    this.payload = null; this.one = false; this.sort = null; this.max = null;
    // Unknown query methods are ignored instead of crashing, so the chain keeps working
    return new Proxy(this, {
      get(t, p, r) {
        if (typeof p === "symbol" || p in t) return Reflect.get(t, p, r);
        return () => r;
      },
    });
  }
  select() { return this; }
  eq(k, v) { this.filters.push((r) => r[k] === v); return this; }
  neq(k, v) { this.filters.push((r) => r[k] !== v); return this; }
  // .not("col", "is", null) means "col is not null"
  not(k, op, v) {
    if (op === "is") this.filters.push((r) => (v === null ? r[k] != null : r[k] !== v));
    else if (op === "eq") this.filters.push((r) => r[k] !== v);
    else if (op === "in") this.filters.push((r) => !String(v).replace(/[()]/g, "").split(",").includes(String(r[k])));
    return this;
  }
  is(k, v) { this.filters.push((r) => (v === null ? r[k] == null : r[k] === v)); return this; }
  in(k, vals) { this.filters.push((r) => vals.includes(r[k])); return this; }
  gte(k, v) { this.filters.push((r) => r[k] >= v); return this; }
  lte(k, v) { this.filters.push((r) => r[k] <= v); return this; }
  order(k, o = {}) { this.sort = { k, asc: o.ascending !== false }; return this; }
  limit(n) { this.max = n; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = "maybe"; return this; }
  insert(p) { this.op = "insert"; this.payload = p; return this; }
  update(p) { this.op = "update"; this.payload = p; return this; }
  upsert(p) { this.op = "insert"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  then(res, rej) { return Promise.resolve(this.run()).then(res, rej); }
  run() {
    const rows = (db[this.table] ||= []);
    const match = rows.filter((r) => this.filters.every((f) => f(r)));
    let data;
    if (this.op === "insert") {
      data = [].concat(this.payload).map((p) => ({ id: newId(), CreatedAt: new Date().toISOString(), ...p }));
      rows.push(...data);
    } else if (this.op === "update") {
      match.forEach((r) => Object.assign(r, this.payload));
      data = match;
    } else if (this.op === "delete") {
      db[this.table] = rows.filter((r) => !match.includes(r));
      data = match;
    } else {
      data = [...match];
      if (this.sort) {
        const { k, asc } = this.sort;
        data.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1));
      }
      if (this.max) data = data.slice(0, this.max);
    }
    if (this.one) {
      if (data[0]) return { data: data[0], error: null };
      return this.one === "maybe" ? { data: null, error: null } : { data: null, error: { message: "not found" } };
    }
    return { data, error: null };
  }
}

// Realtime is not needed in a demo, so channels do nothing.
const fakeChannel = () => {
  const ch = { on: () => ch, subscribe: () => ch, unsubscribe() {} };
  return ch;
};

export const supabase = {
  from: (t) => new Query(t),
  // Database functions (rpc), answered from the in-memory data
  rpc: async (name, args = {}) => {
    // every event row with its club name attached
    if (name === "org_events") {
      const data = db.EventsActivitiesTable.map((e) => ({
        ...e,
        ClubName: db.Clubs.find((c) => c.id === e.ClubId)?.ClubName,
      }));
      return { data, error: null };
    }
    if (name === "club_members") {
      return { data: db.Clubs.map((c) => ({ club_id: c.id, members: memberCounts[c.id] ?? 20 })), error: null };
    }
    if (name === "set_club_members") {
      memberCounts[args.p_club] = args.p_count;
      return { data: null, error: null };
    }
    if (name === "set_starting_balance") {
      const { p_club, p_season, p_amount } = args;
      const row = db.ClubSeasons.find((r) => r.ClubId === p_club && Number(String(r.SeasonStart).slice(0, 4)) === p_season);
      if (row) row.StartingBalance = p_amount;
      else db.ClubSeasons.push({ ClubId: p_club, SeasonStart: p_season, StartingBalance: p_amount });
      return { data: null, error: null };
    }
    return { data: [], error: null };
  },
  channel: fakeChannel,
  removeChannel: () => {},
  auth: {
    getSession: async () => ({ data: { session: null } }),
    getUser: async () => ({ data: { user: { id: "demo-admin", email: "admin@demo.com" } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithOAuth: async () => ({ data: null, error: { message: "Demo only" } }),
    signOut: async () => ({ error: null }),
  },
};