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

type KpiDef      = { key: KpiKey; label: string; short: string };
type KpiCategory = { cat: string; kpis: KpiDef[] };

/* ────────────────────────────────────────────────────────────────────────
   KPI Catalogue
   ──────────────────────────────────────────────────────────────────────── */

const KPI_CATEGORIES: KpiCategory[] = [
  {
    cat: "Artilharia",
    kpis: [
      { key: "total_gols",                   label: "Gols (Total)",         short: "Gols"   },
      { key: "total_assistencias_artilharia", label: "Assistências (Total)", short: "Assist" },
    ],
  },
  {
    cat: "Ataque",
    kpis: [
      { key: "total_finalizacoes_certas",  label: "Fin. Certas (T.)",    short: "Fin.C"  },
      { key: "total_finalizacoes",         label: "Finalizações (T.)",   short: "Fin"    },
      { key: "total_assistencias_ataque",  label: "Assist. Ataque (T.)", short: "Ast.A"  },
      { key: "total_chutes_na_area",       label: "Chutes Área (T.)",    short: "Ch.Int" },
      { key: "total_chutes_fora_area",     label: "Chutes Fora Área (T.)",short: "Ch.Ext"},
      { key: "total_cabeceos_a_gol",       label: "Cabeceios (T.)",      short: "Cab"    },
      { key: "media_ge",                   label: "GE (Média)",          short: "GE"     },
      { key: "total_escanteios",           label: "Escanteios (T.)",     short: "Esc"    },
    ],
  },
  {
    cat: "Defesa",
    kpis: [
      { key: "total_perdas_bola_forcadas",        label: "Perdas de Bola (T.)", short: "P.Bola" },
      { key: "total_pressoes_defensivas",         label: "Pressões Def. (T.)",  short: "Press"  },
      { key: "total_pressoes_defensivas_diretas", label: "Pressões Dir. (T.)",  short: "P.Dir"  },
      { key: "total_gols_contra",                 label: "Gols Contra (T.)",    short: "G.C"    },
    ],
  },
  {
    cat: "Disciplina",
    kpis: [
      { key: "total_faltas_cometidas",            label: "Faltas Comet. (T.)",   short: "F.Com"  },
      { key: "total_faltas_sofridas",             label: "Faltas Sofr. (T.)",    short: "F.Sof"  },
      { key: "total_cartoes_amarelos",            label: "C. Amarelos (T.)",     short: "C.Amar" },
      { key: "total_cartoes_vermelhos",           label: "C. Vermelhos (T.)",    short: "C.Verm" },
      { key: "total_cartoes_vermelhos_indiretos", label: "V.Verm. Ind. (T.)",    short: "C.V.I"  },
      { key: "total_impedimentos",                label: "Impedimentos (T.)",    short: "Imped"  },
      { key: "media_faltas_cometidas",            label: "Faltas Comet. (Méd.)", short: "M.F.C"  },
      { key: "media_cartoes_amarelos",            label: "C. Amarelos (Méd.)",   short: "M.C.A"  },
    ],
  },
  {
    cat: "Distribuição",
    kpis: [
      { key: "total_passes",                     label: "Passes (T.)",           short: "Passes" },
      { key: "media_precisao_passes_pct",        label: "Precisão Passes (Méd.)",short: "P.Pass" },
      { key: "total_cruzamentos",                label: "Cruzamentos (T.)",      short: "Cruz"   },
      { key: "total_tentativas_ruptura_linha",   label: "Rupt. Linha (T.)",      short: "Rupt"   },
      { key: "total_tentativas_mudanca_direcao", label: "Mud. Direção (T.)",     short: "Mud.D"  },
    ],
  },
  {
    cat: "Físico",
    kpis: [
      { key: "total_corridas_alta_velocidade", label: "Corridas AV (T.)",    short: "Corr.AV" },
      { key: "total_arrancadas",               label: "Arrancadas (T.)",     short: "Arran"   },
      { key: "media_velocidade",               label: "Vel. Média (km/h)",   short: "Vel"     },
      { key: "media_distancia_total",          label: "Distância (Méd. m)",  short: "Dist"    },
    ],
  },
  {
    cat: "Goleiro",
    kpis: [
      { key: "total_defesas_goleiro",           label: "Defesas (T.)",         short: "Def"   },
      { key: "total_acoes_goleiro_dentro_area", label: "Ações Dentro Área (T.)",short: "A.Int" },
      { key: "total_acoes_goleiro_fora_area",   label: "Ações Fora Área (T.)", short: "A.Ext" },
    ],
  },
  {
    cat: "Movimentação",
    kpis: [
      { key: "total_pedidos_bola",           label: "Pedidos Bola (T.)",    short: "Ped.B" },
      { key: "total_pedidos_frente",         label: "Pedidos Frente (T.)",  short: "Ped.F" },
      { key: "total_pedidos_entre",          label: "Pedidos Entre (T.)",   short: "Ped.E" },
      { key: "total_recepcoes_entre_linhas", label: "Recep. Linhas (T.)",   short: "Rec.E" },
      { key: "total_recepcoes_sob_pressao",  label: "Recep. Pressão (T.)",  short: "Rec.P" },
      { key: "total_participacoes",          label: "Participações (T.)",   short: "Part"  },
    ],
  },
];

const ALL_KPI_DEFS: KpiDef[] = KPI_CATEGORIES.flatMap((c) => c.kpis);

/* ────────────────────────────────────────────────────────────────────────
   Cave Temperature Color Scale
   Inspired by the cave image: deep navy → electric blue → cyan →
   amethyst purple → hot magenta → torch orange → stalactite amber
   ──────────────────────────────────────────────────────────────────────── */

function tempColor(t: number): string {
  const stops = [
    [0.00,   0,  30, 255],  // neon electric blue
    [0.20,   0, 229, 255],  // neon cyan
    [0.40, 191,   0, 255],  // neon purple
    [0.60, 255,   0, 170],  // neon magenta
    [0.80, 255,  85,   0],  // neon orange
    [1.00, 255, 238,   0],  // neon yellow
  ];
  const n = Math.max(0, Math.min(1, t));
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (n >= stops[i][0] && n <= stops[i + 1][0]) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const f = hi[0] - lo[0] > 0 ? (n - lo[0]) / (hi[0] - lo[0]) : 0;
  return `rgb(${Math.round(lo[1] + f * (hi[1] - lo[1]))},${Math.round(lo[2] + f * (hi[2] - lo[2]))},${Math.round(lo[3] + f * (hi[3] - lo[3]))})`;
}

/* ────────────────────────────────────────────────────────────────────────
   Slot metadata (4 roles)
   ──────────────────────────────────────────────────────────────────────── */

const SLOTS = [
  { label: "Eixo X",      badge: "X",  color: "#0ea5e9", glow: "#0ea5e930" },
  { label: "Eixo Y",      badge: "Y",  color: "#a855f7", glow: "#a855f730" },
  { label: "Tamanho",     badge: "⊙",  color: "#10b981", glow: "#10b98130" },
  { label: "Temperatura", badge: "T°", color: "#f97316", glow: "#f9731630" },
] as const;

/* ────────────────────────────────────────────────────────────────────────
   SVG layout
   ──────────────────────────────────────────────────────────────────────── */

const SVG_W  = 880;
const SVG_H  = 520;
const PAD_L  = 74;
const PAD_R  = 24;
const PAD_T  = 18;
const PAD_B  = 62;
const PLOT_W = SVG_W - PAD_L - PAD_R;
const PLOT_H = SVG_H - PAD_T - PAD_B;
const MIN_R  = 7;
const MAX_R  = 28;
const DEF_R  = 13;

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

function countryCode(s: string): string {
  return s.trim().slice(0, 3).toUpperCase();
}

/* ────────────────────────────────────────────────────────────────────────
   Bubble Chart SVG
   ──────────────────────────────────────────────────────────────────────── */

function BubbleChart({
  teams, kpis, uMin, uMax, highlight,
}: {
  teams:     TimeStatCompleto[];
  kpis:      KpiKey[];
  uMin:      Record<KpiKey, number>;
  uMax:      Record<KpiKey, number>;
  highlight: string;
}) {
  const [xKey, yKey, sKey, cKey] = kpis as [KpiKey, KpiKey | undefined, KpiKey | undefined, KpiKey | undefined];

  /* ── empty state ── */
  if (!xKey || !yKey) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-28"
        style={{ minHeight: 340 }}>
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="26" stroke="#1e3a8a" strokeWidth="1" strokeOpacity="0.4" />
          <circle cx="18" cy="30" r="7"  fill="#0ea5e9" opacity="0.25" />
          <circle cx="34" cy="22" r="10" fill="#a855f7" opacity="0.20" />
          <circle cx="36" cy="36" r="5"  fill="#10b981" opacity="0.18" />
        </svg>
        <p style={{ color: "#2d4a7a", fontSize: "13px" }}>
          Selecione pelo menos 2 KPIs para exibir o gráfico
        </p>
        <p style={{ color: "#1a2d4d", fontSize: "11px" }}>
          Slot 1 → Eixo X · Slot 2 → Eixo Y · Slot 3 → Tamanho · Slot 4 → Temperatura
        </p>
      </div>
    );
  }

  /* ── normalization (0→1 from uMin to uMax) ── */
  const norm = (val: number, key: KpiKey) => {
    const range = uMax[key] - uMin[key];
    return range > 0 ? Math.min(Math.max((val - uMin[key]) / range, 0), 1) : 0.5;
  };

  const toSvgX = (n: number) => PAD_L + n * PLOT_W;
  const toSvgY = (n: number) => PAD_T + (1 - n) * PLOT_H;

  const fmtTick = (n: number, key: KpiKey) =>
    fmtVal(uMin[key] + n * (uMax[key] - uMin[key]), key);

  const X_TICKS = 6;
  const Y_TICKS = 5;
  const xTicks  = Array.from({ length: X_TICKS + 1 }, (_, i) => i / X_TICKS);
  const yTicks  = Array.from({ length: Y_TICKS + 1 }, (_, i) => i / Y_TICKS);

  /* exact match — dropdown sends the full pais name */
  const xLabel = ALL_KPI_DEFS.find((d) => d.key === xKey)?.label ?? "";
  const yLabel = ALL_KPI_DEFS.find((d) => d.key === yKey)?.label ?? "";

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: 520 }}>
      <defs>
        {/* Atmospheric cave background */}
        <radialGradient id="tc-bg" cx="42%" cy="38%" r="68%">
          <stop offset="0%"   stopColor="#0d1f44" />
          <stop offset="55%"  stopColor="#060f26" />
          <stop offset="100%" stopColor="#02060f" />
        </radialGradient>

        {/* Temperature gradient for legend bar — neon scale */}
        <linearGradient id="tc-temp" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#001eff" />
          <stop offset="20%"  stopColor="#00e5ff" />
          <stop offset="40%"  stopColor="#bf00ff" />
          <stop offset="60%"  stopColor="#ff00aa" />
          <stop offset="80%"  stopColor="#ff5500" />
          <stop offset="100%" stopColor="#ffee00" />
        </linearGradient>

        {/* Glow filter for highlighted bubble only */}
        <filter id="tc-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width={SVG_W} height={SVG_H} fill="url(#tc-bg)" rx="12" />

      {/* Ambient cave light bands (horizontal) */}
      <rect x={PAD_L} y={PAD_T}
        width={PLOT_W} height={PLOT_H * 0.33}
        fill="#0ea5e9" fillOpacity="0.018" />
      <rect x={PAD_L} y={PAD_T + PLOT_H * 0.33}
        width={PLOT_W} height={PLOT_H * 0.34}
        fill="#7c3aed" fillOpacity="0.014" />

      {/* Grid lines */}
      {xTicks.filter((t) => t > 0).map((t) => (
        <line key={`xg${t}`}
          x1={toSvgX(t)} y1={PAD_T}
          x2={toSvgX(t)} y2={PAD_T + PLOT_H}
          stroke="#1e3a8a" strokeOpacity="0.13"
          strokeWidth="1" strokeDasharray="3 6" />
      ))}
      {yTicks.filter((t) => t > 0).map((t) => (
        <line key={`yg${t}`}
          x1={PAD_L} y1={toSvgY(t)}
          x2={PAD_L + PLOT_W} y2={toSvgY(t)}
          stroke="#1e3a8a" strokeOpacity="0.13"
          strokeWidth="1" strokeDasharray="3 6" />
      ))}

      {/* Axis lines */}
      <line x1={PAD_L} y1={PAD_T}
            x2={PAD_L} y2={PAD_T + PLOT_H}
        stroke="#1e3a8a" strokeWidth="1.5" strokeOpacity="0.45" />
      <line x1={PAD_L} y1={PAD_T + PLOT_H}
            x2={PAD_L + PLOT_W} y2={PAD_T + PLOT_H}
        stroke="#1e3a8a" strokeWidth="1.5" strokeOpacity="0.45" />

      {/* X axis ticks + labels */}
      {xTicks.map((t) => (
        <g key={`xt${t}`}>
          <line x1={toSvgX(t)} y1={PAD_T + PLOT_H}
                x2={toSvgX(t)} y2={PAD_T + PLOT_H + 5}
            stroke="#1e3a8a" strokeOpacity="0.4" strokeWidth="1" />
          <text x={toSvgX(t)} y={PAD_T + PLOT_H + 15}
            textAnchor="middle" fill="#2d4a7a" fontSize="9">
            {fmtTick(t, xKey)}
          </text>
        </g>
      ))}

      {/* Y axis ticks + labels */}
      {yTicks.map((t) => (
        <g key={`yt${t}`}>
          <line x1={PAD_L - 5} y1={toSvgY(t)}
                x2={PAD_L}     y2={toSvgY(t)}
            stroke="#1e3a8a" strokeOpacity="0.4" strokeWidth="1" />
          <text x={PAD_L - 8} y={toSvgY(t) + 3.5}
            textAnchor="end" fill="#2d4a7a" fontSize="9">
            {fmtTick(t, yKey)}
          </text>
        </g>
      ))}

      {/* X axis label */}
      <text x={PAD_L + PLOT_W / 2} y={SVG_H - 10}
        textAnchor="middle" fill="#0ea5e9" fontSize="10.5"
        fontWeight="600" opacity="0.7">
        ← {xLabel} →
      </text>

      {/* Y axis label (rotated) */}
      <text
        x={12} y={PAD_T + PLOT_H / 2}
        textAnchor="middle" fill="#a855f7" fontSize="10.5"
        fontWeight="600" opacity="0.7"
        transform={`rotate(-90,12,${PAD_T + PLOT_H / 2})`}>
        ← {yLabel} →
      </text>

      {/* Size legend */}
      {sKey && (
        <g opacity="0.7">
          <circle cx={PAD_L + 10} cy={SVG_H - 14} r={MIN_R}
            fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="2 3" strokeOpacity="0.5" />
          <circle cx={PAD_L + 28} cy={SVG_H - 10} r={MAX_R * 0.6}
            fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="2 3" strokeOpacity="0.5" />
          <text x={PAD_L + 44} y={SVG_H - 6} fill="#10b981" fontSize="8" opacity="0.6">
            {ALL_KPI_DEFS.find((d) => d.key === sKey)?.short} = tamanho
          </text>
        </g>
      )}

      {/* Temperature legend bar */}
      {cKey && (
        <g>
          <text x={PAD_L + PLOT_W - 4} y={SVG_H - 26}
            textAnchor="end" fill="#2d4a7a" fontSize="8.5" opacity="0.7">
            {ALL_KPI_DEFS.find((d) => d.key === cKey)?.label}
          </text>
          <rect x={PAD_L + PLOT_W - 180} y={SVG_H - 18}
            width={180} height={8} rx={4}
            fill="url(#tc-temp)" opacity="0.85" />
          <text x={PAD_L + PLOT_W - 180} y={SVG_H - 5}
            fill="#2d4a7a" fontSize="7.5" opacity="0.7">
            {fmtTick(0, cKey)} (frio)
          </text>
          <text x={PAD_L + PLOT_W} y={SVG_H - 5}
            textAnchor="end" fill="#f59e0b" fontSize="7.5" opacity="0.8">
            (quente) {fmtTick(1, cKey)}
          </text>
        </g>
      )}

      {/* Bubbles — non-highlighted first (painter's algorithm) */}
      {([false, true] as boolean[]).flatMap((hiPass) =>
        teams
          .filter((t) => {
            const isHi = highlight !== "" && t.pais === highlight;
            return isHi === hiPass;
          })
          .map((t) => {
            const nx = norm(Number(t[xKey]) || 0, xKey);
            const ny = norm(Number(t[yKey]) || 0, yKey);
            const cx = toSvgX(nx);
            const cy = toSvgY(ny);

            const r = sKey
              ? MIN_R + norm(Number(t[sKey]) || 0, sKey) * (MAX_R - MIN_R)
              : DEF_R;

            const col = cKey
              ? tempColor(norm(Number(t[cKey]) || 0, cKey))
              : "#0ea5e9";

            const isHi = highlight !== "" && t.pais === highlight;
            const code = countryCode(t.pais);

            /* label side: flip when near right/top edge */
            const lx = nx > 0.84 ? cx - r - 4 : cx + r + 4;
            const ly = ny > 0.88 ? cy + r + 12 : cy - r - 5;
            const la = nx > 0.84 ? "end" : "start";

            return (
              <g key={t.pais} filter={isHi ? "url(#tc-glow)" : undefined}>
                {/* Halo ring — apenas no destacado */}
                {isHi && (
                  <circle cx={cx} cy={cy} r={r + 7}
                    fill={col} opacity={0.12} />
                )}

                {/* Main bubble */}
                <circle cx={cx} cy={cy} r={r}
                  fill={col}
                  fillOpacity={isHi ? 0.88 : 0.68}
                  stroke={col}
                  strokeWidth={isHi ? 1.5 : 0.5}
                  strokeOpacity={isHi ? 0.85 : 0.35} />

                {/* Country code inside bubble */}
                {r >= 9 && (
                  <text x={cx} y={cy + 3.5}
                    textAnchor="middle"
                    fill={isHi ? "#fff" : "#e2e8f0"}
                    fontSize={r >= 16 ? 9 : 7}
                    fontWeight={isHi ? "800" : "700"}
                    opacity={isHi ? 1 : 0.85}>
                    {code}
                  </text>
                )}

                {/* Full name label for highlighted */}
                {isHi && (
                  <text x={lx} y={ly}
                    textAnchor={la}
                    fill="#fff" fontSize={10.5}
                    fontWeight="700" opacity="0.95">
                    {t.pais}
                  </text>
                )}
              </g>
            );
          })
      )}
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────────────────────────────────── */

export default function TeamChart({
  times,
  lastUpdated,
}: {
  times:       TimeStatCompleto[];
  lastUpdated: string | null;
}) {
  const [kpis,   setKpis]   = useState<KpiKey[]>(["total_gols", "total_finalizacoes"]);
  const [search, setSearch] = useState("");

  /* Universe min/max: media_ uses real min for better axis spread */
  const uMax = useMemo(() => {
    const r = {} as Record<KpiKey, number>;
    for (const { key } of ALL_KPI_DEFS)
      r[key] = Math.max(...times.map((t) => Number(t[key]) || 0), 1);
    return r;
  }, [times]);

  const uMin = useMemo(() => {
    const r = {} as Record<KpiKey, number>;
    for (const { key } of ALL_KPI_DEFS) {
      const vals = times.map((t) => Number(t[key]) || 0);
      r[key] = String(key).startsWith("media_")
        ? Math.min(...vals) * 0.95
        : 0;
    }
    return r;
  }, [times]);

  function toggleKpi(key: KpiKey) {
    if (kpis.includes(key)) {
      if (kpis.length > 1) setKpis(kpis.filter((k) => k !== key));
    } else if (kpis.length < 4) {
      setKpis([...kpis, key]);
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Filter Panel ──────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(145deg,#050d2e99 0%,#0a162888 60%,#050d2e99 100%)",
        border: "1px solid #1e3a8a38",
        backdropFilter: "blur(16px)",
        borderRadius: "16px",
        padding: "18px 20px",
      }}>

        {/* Slot role legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 mb-5">
          {SLOTS.map((slot, i) => {
            const assigned = kpis[i];
            const def = assigned ? ALL_KPI_DEFS.find((d) => d.key === assigned) : null;
            return (
              <div key={slot.label} className="flex items-center gap-1.5">
                <span style={{
                  width: 22, height: 22, borderRadius: 5,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 900,
                  background: assigned ? slot.glow : "#0a162855",
                  border: `1px solid ${assigned ? slot.color + "55" : "#1e3a8a28"}`,
                  color: assigned ? slot.color : "#1e3a8a",
                }}>
                  {slot.badge}
                </span>
                <span style={{ fontSize: 11, color: assigned ? slot.color : "#2d4a7a" }}>
                  {slot.label}
                </span>
                {def ? (
                  <span style={{ fontSize: 10, color: "#1e3a8a88" }}>· {def.short}</span>
                ) : i >= 2 ? (
                  <span style={{ fontSize: 10, color: "#1a2d4d" }}>· opcional</span>
                ) : null}
              </div>
            );
          })}
          <span style={{
            marginLeft: "auto", alignSelf: "center",
            fontSize: 10, color: "#1e3060",
          }}>
            {kpis.length}/4 KPIs selecionados
          </span>
        </div>

        {/* KPI pills by category */}
        <div className="space-y-2">
          {KPI_CATEGORIES.map(({ cat, kpis: catKpis }) => (
            <div key={cat} className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
              <span style={{
                width: 72, flexShrink: 0,
                fontSize: 9, letterSpacing: "0.09em",
                textTransform: "uppercase", color: "#1e3a8a",
              }}>
                {cat}
              </span>
              {catKpis.map(({ key, label }) => {
                const idx        = kpis.indexOf(key);
                const isSelected = idx !== -1;
                const slot       = isSelected ? SLOTS[idx] : null;
                const isDisabled = !isSelected && kpis.length >= 4;

                return (
                  <button
                    key={String(key)}
                    onClick={() => toggleKpi(key)}
                    disabled={isDisabled}
                    style={{
                      padding: "2px 10px",
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: isSelected ? 600 : 400,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      transition: "all 0.12s ease",
                      background: isSelected
                        ? slot!.glow
                        : isDisabled ? "#0a162840" : "#0a162865",
                      border: `1px solid ${
                        isSelected
                          ? slot!.color + "55"
                          : isDisabled ? "#1e3a8a20" : "#1e3a8a35"
                      }`,
                      color: isSelected
                        ? slot!.color
                        : isDisabled ? "#1a2d4d" : "#3a5a8a",
                    }}
                  >
                    {isSelected && (
                      <span style={{ marginRight: 4, fontSize: 9, opacity: 0.85 }}>
                        {slot!.badge}
                      </span>
                    )}
                    {label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Dropdown / highlight */}
        <div style={{
          marginTop: 16, paddingTop: 16,
          borderTop: "1px solid #1e3a8a22",
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div>
            <p style={{
              fontSize: 9, letterSpacing: "0.09em",
              textTransform: "uppercase", color: "#1e3a8a", marginBottom: 7,
            }}>
              Seleção{" "}
              <span style={{ color: "#0ea5e9" }}>(destaque no gráfico)</span>
            </p>
            <select
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: "#050d2e",
                border: "1px solid #1e3a8a55",
                borderRadius: 9,
                padding: "6px 32px 6px 13px",
                fontSize: 12,
                color: search ? "#94a3b8" : "#3a5a8a",
                outline: "none",
                width: 240,
                cursor: "pointer",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%231e3a8a'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
              }}
            >
              <option value="">— Todas as seleções —</option>
              {[...times]
                .sort((a, b) => a.pais.localeCompare(b.pais, "pt-BR"))
                .map((t) => (
                  <option key={t.pais} value={t.pais}>{t.pais}</option>
                ))}
            </select>
          </div>
          <div style={{ fontSize: 11, color: "#1e3060", paddingTop: 16 }}>
            <span style={{ color: "#3a5a8a", fontWeight: 600 }}>{times.length}</span> seleções
          </div>
        </div>
      </div>

      {/* ── Chart Panel ───────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(160deg,#02060f 0%,#060f26 45%,#030812 100%)",
        border: "1px solid #1e3a8a28",
        borderRadius: 16,
        padding: "12px 6px 6px",
        boxShadow: "0 0 80px #0ea5e906 inset, 0 0 40px #a855f703 inset",
      }}>
        <BubbleChart
          teams={times}
          kpis={kpis}
          uMin={uMin}
          uMax={uMax}
          highlight={search}
        />
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <p style={{ fontSize: 10, color: "#1a2d4d", paddingLeft: 4 }}>
        Fonte: fifa.com
        {lastUpdated && <> · Extração: {fmtDate(lastUpdated)}</>}
      </p>
    </div>
  );
}
