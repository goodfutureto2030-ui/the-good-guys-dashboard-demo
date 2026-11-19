import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";

/* All clubs' logs (every status) for Analytics.
   Reads through the org_events() database function (see analytics.sql),
   because normal users are only allowed to read their own club's rows.
   Reloads when the window gets focus and when any log changes. */
export function useOrgEvents() {
  // Keep the latest organization-wide event list and its request status.
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pull the cross-club view through the database function and normalize errors.
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("org_events");
    if (error) { console.log("org_events error:", error); setError(error); setEvents([]); }
    else { setError(null); setEvents(data || []); }
    setLoading(false);
  }, []);

  // Refresh on mount, relevant database changes, and returning focus.
  useEffect(() => {
    load();
    const channel = supabase
      .channel("org-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "EventsActivitiesTable" }, () => load())
      .subscribe();
    window.addEventListener("focus", load);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  return { events, loading, error, reload: load };
}

// Prefer the joined display name, with older schema fields as fallbacks.
export const clubLabel = (e) => e.ClubName || e.Branch || "Unknown club";