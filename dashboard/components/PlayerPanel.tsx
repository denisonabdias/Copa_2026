import { getJogadores, getLastUpdate } from "@/lib/supabase";
import PlayerChart from "./PlayerChart";

export default async function PlayerPanel() {
  const [jogadores, lastUpdated] = await Promise.all([getJogadores(), getLastUpdate()]);
  return <PlayerChart jogadores={jogadores} lastUpdated={lastUpdated} />;
}
