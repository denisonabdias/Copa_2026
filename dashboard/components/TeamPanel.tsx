import { getTimeStats } from "@/lib/supabase";
import TeamChart from "./TeamChart";

export default async function TeamPanel() {
  const times = await getTimeStats();
  return <TeamChart times={times} />;
}
