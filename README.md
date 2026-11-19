# The Good Guys Dashboard Demo(the-good-guys-dashboard-demo)

A demo of The Good Guys Dashboard, an internal management and analytics platform for a non-profit community organization. It tracks club events, volunteer activity, finances, and an impact score across multiple clubs.

**Live demo:** (https://the-good-guys-dashboard-demo-ifqb.vercel.app)

> **This is a demo build.** It runs entirely in the browser on made-up sample data. It does not connect to a database, and nothing you change is saved (a refresh resets everything). The full application uses Supabase and Google sign-in, and its data is private.

## How to try it 

1. Open the live demo.
2. On the login screen, click **Demo Admin** or **Demo User**. No account is needed.
3. Use the yellow banner at the top to switch between the Admin and User views at any time.

### What each role sees

| | Demo Admin | Demo User |
|---|---|---|
| Goals | View and edit goals | View only |
| Overview (lifetime totals and season trends) | Yes | Hidden |
| Clubs / Analytics | Yes | Yes |
| HQ (event review and finances) | Review, verify, add events for any club | Read-only |
| Club Log | Switch between clubs, add and edit clubs, admin notes | Locked to their own club, can add events |

## Features

- **Goals:** yearly targets for events, funds raised, volunteers, people impacted, and goods donated
- **Overview:** lifetime totals and season-over-season performance trends
- **Clubs / Analytics:** club performance ranking, category trajectory by month, cross-branch comparison, and an activity stream
- **HQ:** event log with review statuses (Verified, Pending, Needs clarification) and a season-by-season financial summary
- **Club Log:** per-club event table, standardized impact score with sub-score breakdown, volunteers-vs-impact scatter plot, and admin follow-up notes

## Tech stack

- React and Vite
- Supabase (in the full app: database, Google OAuth, role-based access)
- CSS
- Deployed on Vercel

## How the demo works

The full app talks to Supabase. For this demo, `src/lib/supabase.js` is replaced with an in-memory stand-in that has the same interface (`from`, `rpc`, `auth`, and so on) and returns sample rows with the real table and column names. The screens run the same code as the real app and cannot tell the difference.

Demo roles come from `src/screens/AuthContext.jsx`, which replaces Google sign-in with the two one-click buttons.

## Run locally

```bash
npm install
npm run dev
```

No environment variables are needed.

## Project structure

```
src/
  components/   shared UI, event modal, finance summary, history
  data/         static prototype data
  lib/          impact score, finance and stats helpers, in-memory data layer
  screens/      Goals, Overview, Analytics, HQ, Club Log, Login, club forms
  styles/       dashboard CSS
```

## Notes

- All club names, people, numbers, and events in this demo are fictional.
- The real application's database, keys, and data are not part of this repository.
