import { useState } from "react";
import { supabase } from "../lib/supabase";

// Status enum values.
export const STATUS = {
  VERIFIED: "Verified",
  PENDING: "Pending",
  CLARIFY: "Needs clarification",
};

export function StatusBadge({ status }) {
  if (status === STATUS.VERIFIED) return <span className="st">Verified</span>;
  if (status === STATUS.CLARIFY) return <span className="st nc">Needs clarification</span>;
  return <span className="pd">Pending</span>;
}

/**
 * Admin-only. Shows Verify and Needs clarification for one log.
 * Needs clarification asks for a short message, saved to EventComments,
 * so the club knows what to fix.
 */
export default function ReviewActions({ event, onDone }) {
  // Track clarification form text, in-flight actions, and request errors.
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Prevent action clicks from triggering any parent row click behavior.
  const stop = (e) => e.stopPropagation(); // table rows are clickable

  // Persist the status and reviewer metadata for this event.
  const setStatus = async (status) => {
    const { data: u } = await supabase.auth.getUser();
    return supabase
      .from("EventsActivitiesTable")
      .update({ Status: status, VerifiedBy: u.user.id, VerifiedAt: new Date().toISOString() })
      .eq("id", event.id);
  };

  // Verify a log, then notify the parent to refresh its data.
  const verify = async (e) => {
    stop(e); setBusy(true); setErr("");
    const { error } = await setStatus(STATUS.VERIFIED);
    setBusy(false);
    if (error) return setErr(error.message);
    onDone?.();
  };

  // Save a clarification request and its message as one review workflow.
  const askClarification = async (e) => {
    stop(e);
    if (!msg.trim()) { setErr("Write what the club needs to clarify."); return; }
    setBusy(true); setErr("");

    const { error } = await setStatus(STATUS.CLARIFY);
    if (error) { setBusy(false); return setErr(error.message); }

    const { data: u } = await supabase.auth.getUser();
    const { error: cErr } = await supabase
      .from("EventComments")
      .insert({ EventId: event.id, UserId: u.user.id, Comment: msg.trim() });
    setBusy(false);
    if (cErr) return setErr(cErr.message);

    setAsking(false); setMsg("");
    onDone?.();
  };

  // Verified records are final in this interface and have no review actions.
  if (event.Status === STATUS.VERIFIED) return null;

  return (
    <div onClick={stop} style={{ display: "grid", gap: 8, minWidth: 220 }}>
      {/* Offer review actions or request details, depending on form state. */}
      {!asking ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn pri" disabled={busy} onClick={verify}>Verify</button>
          {event.Status !== STATUS.CLARIFY && (
            <button className="btn" disabled={busy} onClick={(e) => { stop(e); setAsking(true); }}>
              Needs clarification
            </button>
          )}
        </div>
      ) : (
        <>
          <textarea className="ta" style={{ minHeight: 70, marginTop: 0 }} value={msg}
            placeholder="What should the club clarify?" onChange={(e) => setMsg(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn pri" disabled={busy} onClick={askClarification}>Send</button>
            <button className="btn" disabled={busy} onClick={(e) => { stop(e); setAsking(false); setErr(""); }}>Cancel</button>
          </div>
        </>
      )}
      {err && <small style={{ color: "var(--red)" }}>{err}</small>}
    </div>
  );
}