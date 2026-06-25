import { getJogadores } from "@/lib/supabase";
import PlayerChart from "./PlayerChart";

export default async function PlayerPanel() {
  const jogadores = await getJogadores();
  return <PlayerChart jogadores={jogadores} />;
}
