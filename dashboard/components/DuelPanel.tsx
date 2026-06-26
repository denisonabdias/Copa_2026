import { getTimeStatsCompletos, getLastUpdate } from "@/lib/supabase";
import DuelChart from "./DuelChart";

export default async function DuelPanel() {
  const [times, lastUpdated] = await Promise.all([
    getTimeStatsCompletos(),
    getLastUpdate(),
  ]);
  return <DuelChart times={times} lastUpdated={lastUpdated} />;
}
