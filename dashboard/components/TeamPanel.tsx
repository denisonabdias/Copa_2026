import { getTimeStats, getLastUpdate } from "@/lib/supabase";
import TeamChart from "./TeamChart";

export default async function TeamPanel() {
  const [times, lastUpdated] = await Promise.all([getTimeStats(), getLastUpdate()]);
  return <TeamChart times={times} lastUpdated={lastUpdated} />;
}
