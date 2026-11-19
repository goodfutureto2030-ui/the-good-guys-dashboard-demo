
// Small reusable UI primitives shared by the dashboard forms and pages.
export const Tip = ({ tip, children, ...p }) => <button data-tip={tip} aria-label={tip} {...p}>{children}</button>;
export const Req = () => <span className="req" aria-hidden="true">*</span>;
// Inline SVG assets keep these simple icons independent of external packages.
export const Avatar = () => (<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="28" cy="28" r="26" /><circle cx="28" cy="22" r="8" fill="currentColor" /><path d="M10 46c4-10 12-12 18-12s14 2 18 12" fill="currentColor" /></svg>);
export const Logo = () => <svg width="46" height="46" viewBox="0 0 48 48"><path d="M6 14l22-8 14 14-22 12z" fill="#e9c97a" stroke="#222" strokeWidth="2" /><path d="M6 24l14 8 22-12v6L20 38 6 30z" fill="#58a64a" stroke="#222" strokeWidth="2" /></svg>;
export const Google = () => <svg width="26" height="26" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6C12.3 13.5 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.5 5.8c4.4-4.1 7-10.1 7-17.5z" /><path fill="#FBBC05" d="M10.4 28.8a14.5 14.5 0 010-9.6l-7.8-6a24 24 0 000 21.6z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.700-4-13.600-9.800l-7.800 6C6.500 42.600 14.600 48 24 48z" /></svg>;
// Standard field wrapper keeps labels, required markers, and input styling consistent.
export const Field = ({ label, req, icon, ...p }) => (<div><label>{label}{req && <Req />}</label><div className="in"><span aria-hidden="true">{icon}</span><input {...p} required={req} /></div></div>);
// Map persisted event statuses to their shared visual style classes.
export const statusCls = (s) => (s === "Verified" ? "" : s === "In-Progress" ? "ip" : "nc");