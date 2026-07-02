import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

// ── Types ─────────────────────────────────────────────────────────────────────

export type JogadorCompleto = {
  id:                           number;
  ranking:                      number;
  nome:                         string;
  pais:                         string;
  posicao_campo:                "FW" | "MF" | "DF" | "GK";
  updated_at:                   string;
  // Disciplina
  faltas_cometidas:             number;
  faltas_sofridas:              number;
  cartoes_amarelos:             number;
  cartoes_vermelhos:            number;
  cartoes_vermelhos_indiretos:  number;
  impedimentos:                 number;
  // Artilharia
  gols:                         number;
  assistencias_artilharia:      number;
  minutos_jogados:              number;
  // Ataque
  finalizacoes_certas:          number;
  finalizacoes:                 number;
  finalizacoes_convertidas_pct: number;
  assistencias_ataque:          number;
  chutes_na_area:               number;
  chutes_fora_area:             number;
  cabeceos_a_gol:               number;
  ge:                           number;
  eficiencia_ge:                number;
  escanteios:                   number;
  // Defesa
  perdas_bola_forcadas:         number;
  pressoes_defensivas:          number;
  pressoes_defensivas_diretas:  number;
  gols_contra:                  number;
  // Distribuição
  passes:                         number;
  precisao_passes_pct:            number;
  cruzamentos:                    number;
  precisao_cruzamentos_pct:       number;
  tentativas_ruptura_linha:       number;
  precisao_ruptura_linha_pct:     number;
  tentativas_mudanca_direcao:     number;
  precisao_mudanca_direcao_pct:   number;
  // Físico
  velocidade_media:             number;
  corridas_alta_velocidade:     number;
  arrancadas:                   number;
  distancia_total:              number;
  // Goleiro
  defesas_goleiro:              number;
  acoes_goleiro_dentro_area:    number;
  acoes_goleiro_fora_area:      number;
  // Movimentação
  pedidos_bola:                   number;
  pedidos_frente:                 number;
  pedidos_entre:                  number;
  pedidos_atras:                  number;
  pedidos_dentro_forma_coletiva:  number;
  pedidos_fora_forma_coletiva:    number;
  recepcoes_atras:                number;
  recepcoes_entre_linhas:         number;
  recepcoes_sob_pressao:          number;
  participacoes:                  number;
};

export type TimeStatCompleto = {
  pais:                                   string;
  total_jogadores:                        number;
  // Disciplina
  total_faltas_cometidas:                 number;
  total_faltas_sofridas:                  number;
  total_cartoes_amarelos:                 number;
  total_cartoes_vermelhos:                number;
  total_cartoes_vermelhos_indiretos:      number;
  total_impedimentos:                     number;
  media_faltas_cometidas:                 number;
  media_cartoes_amarelos:                 number;
  // Artilharia
  total_gols:                             number;
  total_assistencias_artilharia:          number;
  // Ataque
  total_finalizacoes_certas:              number;
  total_finalizacoes:                     number;
  total_assistencias_ataque:              number;
  total_chutes_na_area:                   number;
  total_chutes_fora_area:                 number;
  total_cabeceos_a_gol:                   number;
  media_ge:                               number;
  total_escanteios:                       number;
  // Defesa
  total_perdas_bola_forcadas:             number;
  total_pressoes_defensivas:              number;
  total_pressoes_defensivas_diretas:      number;
  total_gols_contra:                      number;
  // Distribuição
  total_passes:                           number;
  media_precisao_passes_pct:              number;
  total_cruzamentos:                      number;
  total_tentativas_ruptura_linha:         number;
  total_tentativas_mudanca_direcao:       number;
  // Físico
  media_velocidade:                       number;
  total_corridas_alta_velocidade:         number;
  total_arrancadas:                       number;
  media_distancia_total:                  number;
  // Goleiro
  total_defesas_goleiro:                  number;
  total_acoes_goleiro_dentro_area:        number;
  total_acoes_goleiro_fora_area:          number;
  // Movimentação
  total_pedidos_bola:                     number;
  total_pedidos_frente:                   number;
  total_pedidos_entre:                    number;
  total_recepcoes_entre_linhas:           number;
  total_recepcoes_sob_pressao:            number;
  total_participacoes:                    number;
};

// ── Queries ───────────────────────────────────────────────────────────────────

const NUM_FIELDS: (keyof JogadorCompleto)[] = [
  "faltas_cometidas", "faltas_sofridas", "cartoes_amarelos", "cartoes_vermelhos",
  "cartoes_vermelhos_indiretos", "impedimentos",
  "gols", "assistencias_artilharia", "minutos_jogados",
  "finalizacoes_certas", "finalizacoes", "finalizacoes_convertidas_pct", "assistencias_ataque",
  "chutes_na_area", "chutes_fora_area", "cabeceos_a_gol", "ge", "eficiencia_ge", "escanteios",
  "perdas_bola_forcadas", "pressoes_defensivas", "pressoes_defensivas_diretas", "gols_contra",
  "passes", "precisao_passes_pct", "cruzamentos", "precisao_cruzamentos_pct",
  "tentativas_ruptura_linha", "precisao_ruptura_linha_pct",
  "tentativas_mudanca_direcao", "precisao_mudanca_direcao_pct",
  "velocidade_media", "corridas_alta_velocidade", "arrancadas", "distancia_total",
  "defesas_goleiro", "acoes_goleiro_dentro_area", "acoes_goleiro_fora_area",
  "pedidos_bola", "pedidos_frente", "pedidos_entre",
  "pedidos_atras", "pedidos_dentro_forma_coletiva", "pedidos_fora_forma_coletiva",
  "recepcoes_atras", "recepcoes_entre_linhas", "recepcoes_sob_pressao", "participacoes",
];

const TIME_NUM_FIELDS: (keyof TimeStatCompleto)[] = [
  "total_faltas_cometidas", "total_faltas_sofridas", "total_cartoes_amarelos",
  "total_cartoes_vermelhos", "total_cartoes_vermelhos_indiretos", "total_impedimentos",
  "media_faltas_cometidas", "media_cartoes_amarelos",
  "total_gols", "total_assistencias_artilharia",
  "total_finalizacoes_certas", "total_finalizacoes", "total_assistencias_ataque",
  "total_chutes_na_area", "total_chutes_fora_area", "total_cabeceos_a_gol",
  "media_ge", "total_escanteios",
  "total_perdas_bola_forcadas", "total_pressoes_defensivas", "total_pressoes_defensivas_diretas",
  "total_gols_contra", "total_passes", "media_precisao_passes_pct",
  "total_cruzamentos", "total_tentativas_ruptura_linha", "total_tentativas_mudanca_direcao",
  "media_velocidade", "total_corridas_alta_velocidade", "total_arrancadas", "media_distancia_total",
  "total_defesas_goleiro", "total_acoes_goleiro_dentro_area", "total_acoes_goleiro_fora_area",
  "total_pedidos_bola", "total_pedidos_frente", "total_pedidos_entre",
  "total_recepcoes_entre_linhas", "total_recepcoes_sob_pressao", "total_participacoes",
];

export async function getJogadoresCompletos(): Promise<JogadorCompleto[]> {
  const { data, error } = await supabase
    .from("stats_completos")
    .select("*")
    .order("ranking", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = { ...r } as JogadorCompleto;
    for (const f of NUM_FIELDS) (row as never as Record<string, number>)[f] = Number(r[f]) || 0;
    return row;
  });
}

export async function getTimeStatsCompletos(): Promise<TimeStatCompleto[]> {
  const { data, error } = await supabase
    .from("stats_completos_por_time")
    .select("*");
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = { ...r } as TimeStatCompleto;
    for (const f of TIME_NUM_FIELDS) (row as never as Record<string, number>)[f] = Number(r[f]) || 0;
    return row;
  });
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
