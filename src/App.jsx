// Keep the demo controls visible alongside the dashboard shell.
import TheGoodGuysDashboard from "./TheGoodGuysDashboard";
import { DemoBanner } from "./components/DemoBanner";

// Root composition for the dashboard experience.
export default function App() {
  return (
    <>
      {/* Demo access controls sit above the active dashboard page. */}
      <DemoBanner />
      <TheGoodGuysDashboard />
    </>
  );
}
