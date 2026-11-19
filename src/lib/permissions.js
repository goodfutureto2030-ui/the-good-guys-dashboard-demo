// Navigation inventory used by the dashboard shell.
export const NAV = ["Goals", "Overview", "Clubs/Analytics", "HQ", "Club Log"];

// Pages and actions available to each role.
const PAGES = {
  Admin: ["Goals", "Overview", "Clubs/Analytics", "HQ", "Club Log"],
  User:  ["Goals", "Clubs/Analytics", "HQ", "Club Log"],
};

const ACTIONS = {
  Admin: ["editGoals", "addClub", "editClub", "verifyEvent", "viewAllClubs"],
  User:  ["addEvent"],
};

// Treat any non-admin role as the restricted user role.
const level = (role) => (role === "Admin" ? "Admin" : "User");

// Centralized role checks keep page and action gating consistent.
export const canSee = (role, page)   => PAGES[level(role)].includes(page);
export const can    = (role, action) => ACTIONS[level(role)].includes(action);