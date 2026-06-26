"use client";

import { useState, useMemo } from "react";
import type { TimeStatCompleto } from "@/lib/supabase";

/* ────────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────────── */

type KpiKey = keyof Pick<
  TimeStatCompleto,
  | "total_faltas_cometidas" | "total_faltas_sofridas"
  | "total_cartoes_amarelos" | "total_cartoes_vermelhos"
  | "total_cartoes_vermelhos_indiretos" | "total_impedimentos"
  | "media_faltas_cometidas" | "media_cartoes_amarelos"
  | "total_gols" | "total_assistencias_artilharia"
  | "total_finalizacoes_certas" | "total_finalizacoes"
  | "total_assistencias_ataque" | "total_chutes_na_area"
  | "total_chutes_fora_area" | "total_cabeceos_a_gol"
  | "media_ge" | "total_escanteios"
  | "total_perdas_bola_forcadas" | "total_pressoes_defensivas"
  | "total_pressoes_defensivas_diretas" | "total_gols_contra"
  | "total_passes" | "media_precisao_passes_pct"
  | "total_cruzamentos" | "total_tentativas_ruptura_linha"
  | "total_tentativas_mudanca_direcao"
  | "media_velocidade" | "total_corridas_alta_velocidade"
  | "total_arrancadas" | "media_distancia_total"
  | "total_defesas_goleiro" | "total_acoes_goleiro_dentro_area"
  | "total_acoes_goleiro_fora_area"
  | "total_pedidos_bola" | "total_pedidos_frente"
  | "total_pedidos_entre" | "total_recepcoes_entre_linhas"
  | "total_recepcoes_sob_pressao" | "total_participacoes"
>;

type KpiDef = { key: KpiKey; label: string; short: string };

/* ────────────────────────────────────────────────────────────────────────
   KPI Catalogue
   ──────────────────────────────────────────────────────────────────────── */

const KPI_CATEGORIES = [
  {
    cat: "Artilharia",
    kpis: [
      { key: "total_gols"                  , label: "Gols (Total)"          , short: "Gols"    },
      { key: "total_assistencias_artilharia", label: "Assistências (Total)"  , short: "Assist"  },
    ] as KpiDef[],
  },
  {
    cat: "Ataque",
    kpis: [
      { key: "total_finalizacoes_certas"  , label: "Fin. Certas (T.)"     , short: "Fin.C"   },
      { key: "total_finalizacoes"         , label: "Finalizações (T.)"    , short: "Fin"     },
      { key: "total_assistencias_ataque"  , label: "Assist. Ataque (T.)"  , short: "Ast.A"   },
      { key: "total_chutes_na_area"       , label: "Chutes Área (T.)"     , short: "Ch.Int"  },
      { key: "total_chutes_fora_area"     , label: "Chutes Fora Área (T.)", short: "Ch.Ext"  },
      { key: "total_cabeceos_a_gol"       , label: "Cabeceios (T.)"       , short: "Cab"     },
      { key: "media_ge"                   , label: "GE (Média)"           , short: "GE"      },
      { key: "total_escanteios"           , label: "Escanteios (T.)"      , short: "Esc"     },
    ] as KpiDef[],
  },
  {
    cat: "Defesa",
    kpis: [
      { key: "total_perdas_bola_forcadas"        , label: "Perdas de Bola (T.)", short: "P.Bola"  },
      { key: "total_pressoes_defensivas"         , label: "Pressões Def. (T.)" , short: "Press"   },
      { key: "total_pressoes_defensivas_diretas" , label: "Pressões Dir. (T.)" , short: "P.Dir"   },
      { key: "total_gols_contra"                 , label: "Gols Contra (T.)"   , short: "G.C"     },
    ] as KpiDef[],
  },
  {
    cat: "Disciplina",
    kpis: [
      { key: "total_faltas_cometidas"           , label: "Faltas Comet. (T.)"  , short: "F.Com"   },
      { key: "total_faltas_sofridas"            , label: "Faltas Sofr. (T.)"   , short: "F.Sof"   },
      { key: "total_cartoes_amarelos"           , label: "C. Amarelos (T.)"    , short: "C.Amar"  },
      { key: "total_cartoes_vermelhos"          , label: "C. Vermelhos (T.)"   , short: "C.Verm"  },
      { key: "total_cartoes_vermelhos_indiretos", label: "V.Verm. Ind. (T.)"   , short: "C.V.I"   },
      { key: "total_impedimentos"               , label: "Impedimentos (T.)"   , short: "Imped"   },
      { key: "media_faltas_cometidas"           , label: "Faltas Comet. (Méd.)", short: "M.F.C"   },
      { key: "media_cartoes_amarelos"           , label: "C. Amarelos (Méd.)"  , short: "M.C.A"   },
    ] as KpiDef[],
  },
  {
    cat: "Distribuição",
    kpis: [
      { key: "total_passes"                    , label: "Passes (T.)"           , short: "Passes"  },
      { key: "media_precisao_passes_pct"       , label: "Precisão Passes (Méd.)", short: "P.Pass"  },
      { key: "total_cruzamentos"               , label: "Cruzamentos (T.)"      , short: "Cruz"    },
      { key: "total_tentativas_ruptura_linha"  , label: "Rupt. Linha (T.)"      , short: "Rupt"    },
      { key: "total_tentativas_mudanca_direcao", label: "Mud. Direção (T.)"     , short: "Mud.D"   },
    ] as KpiDef[],
  },
  {
    cat: "Físico",
    kpis: [
      { key: "total_corridas_alta_velocidade", label: "Corridas AV (T.)"  , short: "Corr.AV" },
      { key: "total_arrancadas"              , label: "Arrancadas (T.)"   , short: "Arran"   },
      { key: "media_velocidade"              , label: "Vel. Média (km/h)" , short: "Vel"     },
      { key: "media_distancia_total"         , label: "Distância (Méd. m)", short: "Dist"    },
    ] as KpiDef[],
  },
  {
    cat: "Goleiro",
    kpis: [
      { key: "total_defesas_goleiro"           , label: "Defesas (T.)"           , short: "Def"    },
      { key: "total_acoes_goleiro_dentro_area" , label: "Ações Dentro Área (T.)" , short: "A.Int"  },
      { key: "total_acoes_goleiro_fora_area"   , label: "Ações Fora Área (T.)"   , short: "A.Ext"  },
    ] as KpiDef[],
  },
  {
    cat: "Movimentação",
    kpis: [
      { key: "total_pedidos_bola"           , label: "Pedidos Bola (T.)"   , short: "Ped.B"  },
      { key: "total_pedidos_frente"         , label: "Pedidos Frente (T.)" , short: "Ped.F"  },
      { key: "total_pedidos_entre"          , label: "Pedidos Entre (T.)"  , short: "Ped.E"  },
      { key: "total_recepcoes_entre_linhas" , label: "Recep. Linhas (T.)"  , short: "Rec.E"  },
      { key: "total_recepcoes_sob_pressao"  , label: "Recep. Pressão (T.)" , short: "Rec.P"  },
      { key: "total_participacoes"          , label: "Participações (T.)"  , short: "Part"   },
    ] as KpiDef[],
  },
];

const ALL_KPI_DEFS: KpiDef[] = KPI_CATEGORIES.flatMap((c) => c.kpis);

/* ────────────────────────────────────────────────────────────────────────
   Row sequence (categories + KPIs)
   ──────────────────────────────────────────────────────────────────────── */

type Row =
  | { type: "cat"; label: string }
  | { type: "kpi"; kpi: KpiDef };

const ROWS: Row[] = KPI_CATEGORIES.flatMap(({ cat, kpis }) => [
  { type: "cat" as const, label: cat },
  ...kpis.map((kpi) => ({ type: "kpi" as const, kpi })),
]);

/* ────────────────────────────────────────────────────────────────────────
   SVG layout constants
   ──────────────────────────────────────────────────────────────────────── */

const SVG_W    = 880;
const BAR_W    = 280;   // width of each team's bar zone
const LABEL_W  = 240;   // center label column
const PAD_L    = 10;
const PAD_R    = 10;
const PAD_T    = 42;    // top padding (includes team name row)
const PAD_B    = 20;
const CX_L     = PAD_L + BAR_W;          // 290 — right edge of left bars
const CX_R     = CX_L + LABEL_W;         // 530 — left edge of right bars
const LBL_CX   = (CX_L + CX_R) / 2;     // 410 — center of label column
const ROW_H    = 22;
const CAT_H    = 28;

// Total SVG height
const N_CATS   = KPI_CATEGORIES.length;
const N_KPIS   = ALL_KPI_DEFS.length;
const SVG_H    = PAD_T + N_CATS * CAT_H + N_KPIS * ROW_H + PAD_B;

/* ────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────────── */

function fmtVal(v: number, key: KpiKey): string {
  if (v >= 10000) return `${(v / 1000).toFixed(0)}k`;
  if (v >= 1000)  return `${(v / 1000).toFixed(1)}k`;
  return String(key).startsWith("media_") ? v.toFixed(1) : Math.round(v).toString();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function selectStyle(accentColor: string): React.CSSProperties {
  return {
    background: "#050d2e",
    border: `1px solid ${accentColor}55`,
    borderRadius: 9,
    padding: "7px 34px 7px 13px",
    fontSize: 12,
    color: "#94a3b8",
    outline: "none",
    width: 240,
    cursor: "pointer",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%231e3a8a'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
  };
}

/* ────────────────────────────────────────────────────────────────────────
   Neon temperature gradient stops (identical to TeamChart)
   fora = quente, centro = frio
   ──────────────────────────────────────────────────────────────────────── */

const NEON_STOPS = [
  { pct: "0%",   color: "#001eff" },
  { pct: "20%",  color: "#00e5ff" },
  { pct: "40%",  color: "#bf00ff" },
  { pct: "60%",  color: "#ff00aa" },
  { pct: "80%",  color: "#ff5500" },
  { pct: "100%", color: "#ffee00" },
];

/* ────────────────────────────────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────────────────────────────────── */

export default function DuelChart({
  times,
  lastUpdated,
}: {
  times:       TimeStatCompleto[];
  lastUpdated: string | null;
}) {
  const [t1, setT1] = useState("");
  const [t2, setT2] = useState("");

  const sortedTeams = useMemo(
    () => [...times].sort((a, b) => a.pais.localeCompare(b.pais, "pt-BR")),
    [times],
  );

  const data1 = times.find((t) => t.pais === t1);
  const data2 = times.find((t) => t.pais === t2);

  /* universe max for proportional bars */
  const uMax = useMemo(() => {
    const r = {} as Record<KpiKey, number>;
    for (const { key } of ALL_KPI_DEFS)
      r[key] = Math.max(...times.map((t) => Number(t[key]) || 0), 1);
    return r;
  }, [times]);

  const norm = (val: number, key: KpiKey) =>
    uMax[key] > 0 ? Math.min(val / uMax[key], 1) : 0;

  /* render the butterfly SVG */
  function renderChart() {
    let y = PAD_T;

    return (
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ minWidth: 560 }}
      >
        <defs>
          {/* Cave-dark background */}
          <radialGradient id="dl-bg" cx="50%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#0d1f44" />
            <stop offset="60%"  stopColor="#060f26" />
            <stop offset="100%" stopColor="#020610" />
          </radialGradient>

          {/*
            Left bar gradient: fora (esquerda) = quente, centro (CX_L) = frio
            gradientUnits="userSpaceOnUse" → coordenadas fixas no SVG
            x1=CX_L (centro, frio) → x2=PAD_L (fora, quente)
            Um bar com n=0.5 tem tip em x=CX_L - 0.5*BAR_W
            Fração do gradiente nesse ponto = 0.5 → tempColor(0.5) ✓
          */}
          <linearGradient
            id="dl-left"
            gradientUnits="userSpaceOnUse"
            x1={CX_L} y1="0" x2={PAD_L} y2="0"
          >
            {NEON_STOPS.map((s) => (
              <stop key={s.pct} offset={s.pct} stopColor={s.color} />
            ))}
          </linearGradient>

          {/*
            Right bar gradient: centro (CX_R) = frio, fora (direita) = quente
          */}
          <linearGradient
            id="dl-right"
            gradientUnits="userSpaceOnUse"
            x1={CX_R} y1="0" x2={CX_R + BAR_W} y2="0"
          >
            {NEON_STOPS.map((s) => (
              <stop key={s.pct} offset={s.pct} stopColor={s.color} />
            ))}
          </linearGradient>

          {/* Glow for team headers */}
          <filter id="dl-cyan-glow" x="-30%" y="-80%" width="160%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="dl-purple-glow" x="-30%" y="-80%" width="160%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={SVG_W} height={SVG_H} fill="url(#dl-bg)" />

        {/* Ambient tint bands over bar zones */}
        <rect x={PAD_L} y={0} width={BAR_W} height={SVG_H}
          fill="#0ea5e9" fillOpacity="0.014" />
        <rect x={CX_R} y={0} width={BAR_W} height={SVG_H}
          fill="#a855f7" fillOpacity="0.014" />

        {/* Column dividers */}
        <line x1={CX_L} y1={0} x2={CX_L} y2={SVG_H}
          stroke="#1e3a8a" strokeOpacity="0.35" strokeWidth="1" />
        <line x1={CX_R} y1={0} x2={CX_R} y2={SVG_H}
          stroke="#1e3a8a" strokeOpacity="0.35" strokeWidth="1" />

        {/* ── Team name headers ── */}
        {/* Team 1 name (left side) */}
        <text
          x={CX_L - 12} y={26}
          textAnchor="end"
          fill="#0ea5e9" fontSize={14} fontWeight="800"
          filter="url(#dl-cyan-glow)" opacity="0.95"
        >
          {t1}
        </text>

        {/* VS label (center) */}
        <text
          x={LBL_CX} y={26}
          textAnchor="middle"
          fill="#1e3a8a" fontSize={11} fontWeight="900"
          letterSpacing="0.12em" opacity="0.6"
        >
          DUELO
        </text>

        {/* Team 2 name (right side) */}
        <text
          x={CX_R + 12} y={26}
          textAnchor="start"
          fill="#a855f7" fontSize={14} fontWeight="800"
          filter="url(#dl-purple-glow)" opacity="0.95"
        >
          {t2}
        </text>

        {/* Thin separator under headers */}
        <line x1={0} y1={PAD_T - 6} x2={SVG_W} y2={PAD_T - 6}
          stroke="#1e3a8a" strokeOpacity="0.25" strokeWidth="1" />

        {/* ── Rows ── */}
        {ROWS.map((row, i) => {
          if (row.type === "cat") {
            const ry = y;
            y += CAT_H;
            return (
              <g key={`cat-${i}`}>
                {/* Category background stripe */}
                <rect x={0} y={ry} width={SVG_W} height={CAT_H}
                  fill="#0ea5e9" fillOpacity="0.03" />
                <line x1={0} y1={ry} x2={SVG_W} y2={ry}
                  stroke="#1e3a8a" strokeOpacity="0.18" strokeWidth="1" />

                {/* Category label */}
                <text
                  x={LBL_CX} y={ry + CAT_H * 0.68}
                  textAnchor="middle"
                  fill="#1e3a8a" fontSize={9} fontWeight="700"
                  letterSpacing="0.12em"
                >
                  {row.label.toUpperCase()}
                </text>
              </g>
            );
          }

          /* ── KPI row ── */
          const { key, label } = row.kpi;
          const v1 = Number(data1?.[key]) || 0;
          const v2 = Number(data2?.[key]) || 0;
          const n1 = norm(v1, key);
          const n2 = norm(v2, key);
          const bw1 = n1 * BAR_W;
          const bw2 = n2 * BAR_W;
          const rowY = y;
          y += ROW_H;

          const barH      = 10;
          const barYOff   = (ROW_H - barH) / 2;
          const textY     = rowY + ROW_H * 0.66;

          /* winner coloring for value labels */
          const win1 = v1 > v2;
          const win2 = v2 > v1;

          return (
            <g key={String(key)}>
              {/* Row separator */}
              <line x1={0} y1={rowY + ROW_H} x2={SVG_W} y2={rowY + ROW_H}
                stroke="#1e3a8a" strokeOpacity="0.07" strokeWidth="1" />

              {/* Left bar (team 1) */}
              {bw1 > 0.5 && (
                <rect
                  x={CX_L - bw1} y={rowY + barYOff}
                  width={bw1} height={barH} rx={2}
                  fill="url(#dl-left)" opacity="0.82"
                />
              )}

              {/* Right bar (team 2) */}
              {bw2 > 0.5 && (
                <rect
                  x={CX_R} y={rowY + barYOff}
                  width={bw2} height={barH} rx={2}
                  fill="url(#dl-right)" opacity="0.82"
                />
              )}

              {/* Value — team 1 (left of bar tip) */}
              <text
                x={Math.min(CX_L - bw1 - 5, CX_L - 5)}
                y={textY}
                textAnchor="end"
                fill={win1 ? "#0ea5e9" : "#2d4a7a"}
                fontSize={8.5}
                fontWeight={win1 ? "700" : "400"}
              >
                {fmtVal(v1, key)}
              </text>

              {/* Value — team 2 (right of bar tip) — rosa */}
              <text
                x={CX_R + bw2 + 5}
                y={textY}
                textAnchor="start"
                fill={win2 ? "#f472b6" : "#2d4a7a"}
                fontSize={8.5}
                fontWeight={win2 ? "700" : "400"}
              >
                {fmtVal(v2, key)}
              </text>

              {/* KPI label (center column) — mais claro */}
              <text
                x={LBL_CX} y={textY}
                textAnchor="middle"
                fill="#6b8fc4" fontSize={9}
              >
                {label}
              </text>

              {/* Winner dot */}
              {win1 && bw1 > 8 && (
                <circle cx={CX_L - bw1} cy={rowY + barYOff + barH / 2}
                  r={2.5} fill="#0ea5e9" opacity="0.7" />
              )}
              {win2 && bw2 > 8 && (
                <circle cx={CX_R + bw2} cy={rowY + barYOff + barH / 2}
                  r={2.5} fill="#f472b6" opacity="0.7" />
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Filter panel ─────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(145deg,#050d2e99 0%,#0a162888 60%,#050d2e99 100%)",
        border: "1px solid #1e3a8a38",
        backdropFilter: "blur(16px)",
        borderRadius: 16,
        padding: "18px 22px",
      }}>
        <div className="flex flex-wrap items-end gap-6">

          {/* Team 1 */}
          <div>
            <p style={{
              fontSize: 9, letterSpacing: "0.09em", textTransform: "uppercase",
              color: "#0ea5e9", marginBottom: 7,
            }}>
              Seleção 1 — Esquerda (←)
            </p>
            <select
              value={t1}
              onChange={(e) => setT1(e.target.value)}
              style={selectStyle("#0ea5e9")}
            >
              <option value="">— Escolha uma seleção —</option>
              {sortedTeams.map((t) => (
                <option key={t.pais} value={t.pais}>{t.pais}</option>
              ))}
            </select>
          </div>

          {/* VS divider */}
          <div style={{
            alignSelf: "center", paddingBottom: 2,
            fontSize: 15, fontWeight: 900, letterSpacing: "0.15em",
            color: "#1e3a8a", opacity: 0.7,
          }}>
            VS
          </div>

          {/* Team 2 */}
          <div>
            <p style={{
              fontSize: 9, letterSpacing: "0.09em", textTransform: "uppercase",
              color: "#a855f7", marginBottom: 7,
            }}>
              Seleção 2 — Direita (→)
            </p>
            <select
              value={t2}
              onChange={(e) => setT2(e.target.value)}
              style={selectStyle("#a855f7")}
            >
              <option value="">— Escolha uma seleção —</option>
              {sortedTeams.map((t) => (
                <option key={t.pais} value={t.pais}>{t.pais}</option>
              ))}
            </select>
          </div>

          {/* Info */}
          <div style={{ fontSize: 11, color: "#1e3060", paddingBottom: 2 }}>
            <span style={{ color: "#3a5a8a", fontWeight: 600 }}>{times.length}</span>{" "}
            seleções disponíveis
          </div>
        </div>
      </div>

      {/* ── Chart panel ──────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(160deg,#02060f 0%,#060f26 45%,#030812 100%)",
        border: "1px solid #1e3a8a28",
        borderRadius: 16,
        padding: "12px 8px 8px",
        boxShadow: "0 0 80px #0ea5e906 inset",
      }}>
        {!t1 || !t2 ? (
          /* empty state */
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="20" cy="32" r="16" stroke="#1e3a8a" strokeWidth="1" strokeOpacity="0.5" />
              <circle cx="44" cy="32" r="16" stroke="#1e3a8a" strokeWidth="1" strokeOpacity="0.5" />
              <line x1="32" y1="16" x2="32" y2="48" stroke="#1e3a8a" strokeWidth="0.8" strokeOpacity="0.3" />
              <circle cx="20" cy="32" r="5" fill="#0ea5e9" opacity="0.3" />
              <circle cx="44" cy="32" r="5" fill="#a855f7" opacity="0.3" />
            </svg>
            <p style={{ color: "#2d4a7a", fontSize: 14 }}>
              Selecione duas seleções para ver o duelo
            </p>
            <p style={{ color: "#1a2d4d", fontSize: 11 }}>
              Barras crescem de dentro (frio) para fora (quente) em escala neon
            </p>
          </div>
        ) : (
          /* butterfly chart */
          <div style={{ overflowY: "auto", maxHeight: "78vh" }}>
            {renderChart()}
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <p style={{ fontSize: 10, color: "#1a2d4d", paddingLeft: 4 }}>
        Fonte: fifa.com
        {lastUpdated && <> · Extração: {fmtDate(lastUpdated)}</>}
      </p>
    </div>
  );
}
