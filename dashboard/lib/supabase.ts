import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Jogador = {
  id: number;
  ranking: number;
  nome: string;
  pais: string;
  posicao_campo: "FW" | "MF" | "DF" | "GK";
  faltas_cometidas: number;
  faltas_sofridas: number;
  cartoes_amarelos: number;
  cartoes_vermelhos: number;
  cartoes_vermelhos_indiretos: number;
  impedimentos: number;
  updated_at: string;
};

export type TimeStat = {
  pais: string;
  total_jogadores: number;
  total_faltas_cometidas: number;
  total_faltas_sofridas: number;
  total_cartoes_amarelos: number;
  total_cartoes_vermelhos: number;
  total_cartoes_vermelhos_indiretos: number;
  total_impedimentos: number;
  media_faltas_cometidas: number;
  media_cartoes_amarelos: number;
};

export type PosicaoStat = {
  posicao_campo: string;
  total_jogadores: number;
  total_faltas_cometidas: number;
  total_faltas_sofridas: number;
  total_cartoes_amarelos: number;
  total_cartoes_vermelhos: number;
  total_cartoes_vermelhos_indiretos: number;
  total_impedimentos: number;
  media_faltas_cometidas: number;
  media_cartoes_amarelos: number;
};

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getJogadores(): Promise<Jogador[]> {
  const { data, error } = await supabase
    .from("disciplina_jogadores")
    .select("*")
    .order("ranking", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getTimeStats(): Promise<TimeStat[]> {
  const { data, error } = await supabase
    .from("disciplina_por_time")
    .select("*");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    media_faltas_cometidas: Number(r.media_faltas_cometidas),
    media_cartoes_amarelos: Number(r.media_cartoes_amarelos),
  }));
}

export async function getLastUpdate(): Promise<string | null> {
  const { data } = await supabase
    .from("disciplina_jogadores")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
  return data?.updated_at ?? null;
}

export async function getPosicaoStats(): Promise<PosicaoStat[]> {
  const { data, error } = await supabase
    .from("disciplina_por_posicao")
    .select("*");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    media_faltas_cometidas: Number(r.media_faltas_cometidas),
    media_cartoes_amarelos: Number(r.media_cartoes_amarelos),
  }));
}
