import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "./lib/supabase";
import "./styles/TheGoodGuysDashboard.css";
import { NAV } from "./data/mock";
import { Tip, Avatar } from "./components/ui";
import Login from "./screens/Login";
import Goals from "./screens/Goals";
import Overview from "./screens/Overview";
import Analytics from "./screens/Analytics";
import HQ from "./screens/HQ";
import ClubLog from "./screens/Clublog.jsx"; // must match the real filename's capitalization exactly
import AddClub from "./screens/AddClub";
import EditClub from "./screens/EditClub";
import logo from "./assets/TheGoodGuysLogo.png";
import { useAuth } from "./screens/AuthContext";

const ADMIN_ONLY_TABS = ["Overview"];

// ---- sample data (used in demo mode, and as the starting defaults) ----
// label is included because HQ and the event forms read c.label
const DEMO_CLUB_ROWS = [
  { id: 1, ClubName: "A - Harbourview", label: "A - Harbourview" },
  { id: 2, ClubName: "B - Northgate", label: "B - Northgate" },
  { id: 3, ClubName: "C - Eastside", label: "C - Eastside" },
  { id: 4, ClubName: "D - Riverside", label: "D - Riverside" },
];
const DEMO_META = {
  "A - Harbourview": { loc: "Harbourview", dir: "Alex Demo", year: "2025/2026", bal: "8400" },
  "B - Northgate": { loc: "Northgate", dir: "Sam Sample", year: "2025/2026", bal: "5200" },
  "C - Eastside": { loc: "Eastside", dir: "Jo Example", year: "2025/2026", bal: "6100" },
  "D - Riverside": { loc: "Riverside", dir: "Chris Test", year: "2025/2026", bal: "4300" },
};
const DEMO_CLUB_NAMES = DEMO_CLUB_ROWS.map((c) => c.ClubName);

export default function GoodGuysDashboard({ username = "Username" }) {
  // ---- state ----
  const { role: demoRole, loginAsDemo, logout: demoLogout } = useAuth();
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState("User");
  const [myClubId, setMyClubId] = useState(null);   // the user's own club (Profile.ClubId)
  const [tab, setTab] = useState("Goals");
  const [view, setView] = useState("log"); // "log" | "add" | "edit"
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  const [clubs, setClubs] = useState(DEMO_CLUB_NAMES);
  const [clubRows, setClubRows] = useState(DEMO_CLUB_ROWS); // [{ id, ClubName, label }] used by the log forms
  const [sel, setSel] = useState(DEMO_CLUB_NAMES[0]);
  const [meta, setMeta] = useState(DEMO_META);

  const isAdmin = role === "Admin";
  const isDemo = !!demoRole;

  // memoized so it only changes when session or demoRole changes (this fixes the infinite loop)
  const activeSession = useMemo(() => {
    if (session) return session;
    if (!demoRole) return null;
    return {
      user: {
        id: `demo-${demoRole}`,
        email: `${demoRole}@demo.com`,
        user_metadata: { full_name: demoRole === "admin" ? "Demo Admin" : "Demo User" },
      },
    };
  }, [session, demoRole]);

  // HQ-wide starting balance = sum of club balances
  const startBalance = Object.values(meta).reduce((a, m) => a + (Number(m.bal) || 0), 0);

  // ---- 1. login status ----
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => setSession(data.session))
      .catch((e) => console.log("session error:", e))
      .finally(() => setChecking(false));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---- 2. admin or user, plus the user's club ----
  useEffect(() => {
    if (demoRole) {
      setRole(demoRole === "admin" ? "Admin" : "User");
      setMyClubId(1);
      return;
    }
    if (!session?.user) {
      setRole("User");
      setMyClubId(null);
      return;
    }
    supabase
      .from("Profile")
      .select("Role, ClubId")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) { console.log("role error:", error); return; }
        setRole(data.Role);
        setMyClubId(data.ClubId);
      });
  }, [session, demoRole]);

  // ---- 3. list of clubs ----
  useEffect(() => {
    if (demoRole) {
      // demo: no database, use sample data
      setClubs(DEMO_CLUB_NAMES);
      setClubRows(DEMO_CLUB_ROWS);
      setMeta(DEMO_META);
      setSel(DEMO_CLUB_NAMES[0]);
      return;
    }
    if (!session) return;
    supabase.from("Clubs").select("*").order("id").then(({ data, error }) => {
      if (error) { console.log("load error:", error); return; }
      if (data.length) {
        setClubs(data.map((r) => r.ClubName));
        setClubRows(data.map((r) => ({ id: r.id, ClubName: r.ClubName, label: r.ClubName })));
        setMeta(Object.fromEntries(
          data.map((r) => [r.ClubName, { loc: r.loc, dir: r.director, year: r.year, bal: r.balance }])
        ));
        setSel(data[0].ClubName);
      }
    });
  }, [session, demoRole]);

  // ---- 3b. users are locked to their own club ----
  useEffect(() => {
    if (isAdmin || !myClubId) return;
    const mine = clubRows.find((c) => c.id === myClubId);
    if (mine) setSel(mine.ClubName);
  }, [isAdmin, myClubId, clubRows]);

  // ---- 4. close the account menu when clicking outside ----
  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // ---- 5. users cannot open admin-only pages ----
  useEffect(() => {
    if (!isAdmin && ADMIN_ONLY_TABS.includes(tab)) setTab("Goals");
  }, [isAdmin, tab]);

  const visibleNav = NAV.filter((n) => isAdmin || !ADMIN_ONLY_TABS.includes(n));

  // ---- auth actions ----
  const signIn = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    console.log("signIn:", data, error);
  };

  const signOut = async () => {
    setMenu(false);
    setTab("Goals");
    setView("log");
    demoLogout();
    if (session) await supabase.auth.signOut();
  };

  const switchDemo = (r) => {
    loginAsDemo(r);
    setTab("Goals");
    setView("log");
  };

  const displayName =
    activeSession?.user?.user_metadata?.full_name || activeSession?.user?.email || username;

  const go = (n) => { setTab(n); setView("log"); };

  // ---- club actions (admin only) ----
  const saveClub = async ({ name, loc, dirs, year, bal }) => {
    const ClubName = `${String.fromCharCode(65 + clubs.length)} - ${name}`;

    if (isDemo) {
      setClubs([...clubs, ClubName]);
      setClubRows([...clubRows, { id: Date.now(), ClubName, label: ClubName }]);
      setMeta({ ...meta, [ClubName]: { loc, dir: dirs[0], year, bal } });
      setView("log");
      return;
    }

    const { data, error } = await supabase
      .from("Clubs")
      .insert({ ClubName, loc, director: dirs[0], year, balance: bal })
      .select()
      .single();
    if (error) { console.log("save error:", error); return; }
    setClubs([...clubs, ClubName]);
    setClubRows([...clubRows, { id: data.id, ClubName, label: ClubName }]);
    setMeta({ ...meta, [ClubName]: { loc, dir: dirs[0], year, bal } });
    setView("log");
  };

  const saveEdit = async ({ name, loc, dir, year, bal }) => {
    if (!isDemo) {
      const { data, error } = await supabase
        .from("Clubs")
        .update({ ClubName: name, loc, director: dir, year, balance: bal })
        .eq("ClubName", sel)
        .select();
      if (error || !data.length) { console.log("edit error:", error, data); return; }
    }
    setClubs(clubs.map((c) => (c === sel ? name : c)));
    setClubRows(clubRows.map((c) => (c.ClubName === sel ? { ...c, ClubName: name, label: name } : c)));
    setMeta({ ...meta, [name]: { loc, dir, year, bal } });
    setSel(name);
    setView("log");
  };

  const curMeta = meta[sel] || { loc: "", dir: "", year: "2025/2026", bal: "0" };

  if (checking) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div className="gg">
      {!activeSession ? (
        <Login onLogin={signIn} />
      ) : (
        <>
          {isDemo && (
            <div className="demo-banner">
              <span>Demo mode: sample data only, changes reset on refresh</span>
              <div>
                <button type="button" className={demoRole === "admin" ? "on" : ""} onClick={() => switchDemo("admin")}>Admin</button>
                <button type="button" className={demoRole === "user" ? "on" : ""} onClick={() => switchDemo("user")}>User</button>
              </div>
            </div>
          )}

          <header className="nav">
            <div className="logo">
              <img src={logo} alt="The Good Guys Logo" />
            </div>

            <nav className="tabs" aria-label="Main">
              {visibleNav.map((n) => (
                <Tip key={n} tip={`Go to ${n}`} className={tab === n ? "on" : ""} onClick={() => go(n)}>
                  {n}
                </Tip>
              ))}
            </nav>

            <div className="user-wrap" ref={menuRef}>
              <button
                type="button"
                className={`user ${isAdmin ? "admin" : ""}`}
                onClick={() => setMenu((m) => !m)}
                aria-haspopup="menu"
                aria-expanded={menu}
              >
                {displayName}
                <Avatar />
              </button>

              {menu && (
                <div className="umenu" role="menu">
                  <div className="umenu-info">
                    <b>{activeSession.user.email}</b>
                    <small>{isAdmin ? "Admin" : "User"}</small>
                  </div>
                  <button type="button" role="menuitem" onClick={signOut}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </header>

          {tab === "Goals" && <Goals canEdit={isAdmin} />}
          {tab === "Overview" && isAdmin && <Overview />}
          {tab === "Clubs/Analytics" && <Analytics clubRows={clubRows} />}
          {tab === "HQ" && (
            <HQ isAdmin={isAdmin} clubRows={clubRows} myClubId={myClubId} startBalance={startBalance} />
          )}
          {tab === "Club Log" &&
            (view === "add" && isAdmin ? (
              <AddClub current={sel} onBack={() => setView("log")} onSave={saveClub} />
            ) : view === "edit" && isAdmin ? (
              <EditClub key={sel} club={sel} meta={curMeta} onBack={() => setView("log")} onSave={saveEdit} />
            ) : (
              <ClubLog
                clubs={clubs}
                sel={sel}
                setSel={setSel}
                isAdmin={isAdmin}
                myClubId={myClubId}
                clubRows={clubRows}
                onAddClub={isAdmin ? () => setView("add") : undefined}
                onEditClub={isAdmin ? () => setView("edit") : undefined}
                meta={curMeta}
              />
            ))}
        </>
      )}
    </div>
  );
}