/* ---------- data (mock; replace with Supabase later) ---------- */
// Sample goal cards and trends retained for the static dashboard prototype.
export const GOALS_TOP = [["# of Events Hosted", "502"], ["Money Fund-raised", "$3,652"], ["Volunteers Involved", "560"], ["Community Sponsor Involved", "614"]];
export const GOALS_BOT = [["# of People Impacted", "700"], ["Sandwiches Donated", "61.4k"], ["Care Packages Distributed", "52"], ["Non Perishable Food Collected", "52kg"], ["Water Bottles Donated", "61.4k"], ["Clothing Collected&Donated", "61"]];
export const TRENDS = [
  ["# of Events Hosted", "502", "335", "+50%", "Community activations are accelerating."],
  ["Money Fund-raised", "$3,652", "$2,435", "+50%", "Fundraising momentum is improving."],
  ["Volunteers Involved", "560", "373", "+50%", "Volunteer participation is trending upward."],
  ["Community Sponsor Involved", "614", "409", "+50%", "Sponsor engagement remains positive."],
  ["# of People Impacted", "700", "467", "+50%", "Reach is expanding across supported communities."],
  ["Care Packages Distributed", "52", "35", "+50%", "Package delivery is stable and improving."],
  ["Non Perishable Food Collected", "52k lbs", "35k lbs", "+50%", "Package delivery is stable and improving."],
  ["Water Bottles Donated", "61.4k", "69.8k", "-12%", "Water bottle donations are the only worsening trend on the board.", true],
  ["Sandwiches Donated", "614", "409", "+50%", "Food distribution volume is improving.", false, 2],
  ["Clothing Collected&Donated", "61", "41", "+50%", "Clothing collection is improving, but still the slowest trend.", false, 2],
];
// Mock club and chart rows retain the shapes expected by prototype widgets.
export const CLUBS = [["HQ", "72.6", "$2,340", 215, 480, 8], ["West Vancouver", "64.8", "$1,185", 97, 310, 6], ["Burnaby", "55.3", "$890", 186, 275, 5], ["Richmond", "43.7", "$560", 62, 135, 3]];
export const BARS = [["North Shore", 120, 18, 72.6], ["West Van", 76, 4, 64.8], ["Burnaby", 68, 26, 55.3], ["Richmond", 34, 9, 43.7]];
export const ACTIVITY = [["2027-01-20", "A - West Vancouver", "Bake Sales", "Fundraiser"], ["2026-12-02", "A - West Vancouver", "Clothing Drive", "Direct Relief"], ["2026-11-28", "B - North Shore", "Winter Bottle Drive", "Fundraiser"], ["2026-11-14", "A - West Vancouver", "Nov KK Fundraising", "Fundraiser"], ["2026-10-30", "C - Burnaby", "Shelter Meal Program", "Direct Relief"], ["2026-10-15", "A - West Vancouver", "Community Garden Setup", "General/Community"], ["2026-09-28", "D - Richmond", "Fall Food Drive", "Direct Relief"], ["2026-09-12", "B - North Shore", "Annual Fundraising Gala", "Fundraiser"]];
// Representative event records for legacy table and activity examples.
export const EVENTS = [
  ["A", "2026/05/04", "Fundraiser", "$1,240", "$1,240", 68.2, 180, 180, 180, 310, 6, 6, "Verified"],
  ["B", "2026/05/04", "Fundraiser", "$772", "$690", 68.2, 180, 180, 44, 240, 5, 5, "Verified"],
  ["C", "2026/05/04", "Community Reach", "$690", "$690", 58.9, 180, 260, 260, 380, 5, 5, "Needs clarification"],
  ["D", "2026/05/04", "Fundraiser", "$438", "$690", 47.1, 180, 90, 90, 150, 3, 3, "Verified"],
  ["E", "2026/05/05", "Direct Relief", "$1,860", "$1,120", 72.4, 320, 420, 420, 520, 12, 12, "In-Progress"],
];
export const NAV = ["Goals", "Overview", "Clubs/Analytics", "HQ", "Club Log"];
export const PHOTOS = ["https://placehold.co/600x500/ddd/555?text=Team", "https://placehold.co/600x500/e8dcc0/555?text=Sandwiches", "https://placehold.co/600x500/f1ece3/555?text=Krispy+Kreme", "https://placehold.co/600x500/cfe3f5/555?text=Water"];

export const CL_EVENTS = [
  ["A", "Fundraiser", "2026/05/04", "Fundraiser", "$1,240", "$1,240", 68.2, 180, 180, 180, 310, 6, "Verified"],
  ["B", "Direct Relief", "2026/05/04", "Direct Relief", "$772", "$1,240", 68.2, 180, 180, 44, 240, 5, "Pending"],
  ["C", "Fundraiser", "2026/05/04", "Fundraiser", "$690", "$690", 58.9, 180, 260, 260, 380, 5, "Verified"],
  ["D", "Fundraiser", "2026/05/04", "Fundraiser", "$438", "$690", 47.1, 180, 90, 90, 150, 3, "Pending"],
];
export const CL_COLS = ["Event", "Date", "Category", "Net Revenue", "Expenses", "Volunteers", "People Impacted", "Care Packages", "Sandwiches", "Water Bottles", "Volunteer Hours", "Duration (hr)", "Location", "Status"];
export const SUBS = [["Financial", 22.5, 90, "#3d6640"], ["Goods (RU)", 6.0, 60, "#111827"], ["Reach", 15.0, 75, "#e8dcc0"], ["Volunteer Efficiency", 21.2, 95, "#b5483a"]];
export const DOTS = [[22, 58, 5, "A"], [38, 74, 9, "B"], [55, 66, 7, "C"], [62, 60, 9, "D"], [62, 54, 6, "E"]];
export const NOTES = ["Review waiting events (2) before the next director sync.", "Follow up on Goods (RU) reporting for Fundraiser events.", "Compare volunteer efficiency across Direct Relief and Fundraiser categories."];

export const DIRECTORS = ["Yuzuki Sato", "Mae Patel", "Riley Chen"];