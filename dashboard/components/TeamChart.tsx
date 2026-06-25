"use client";

import { useState, useMemo } from "react";
import type { TimeStat } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────────────────────────── */

type KpiKey = keyof Pick<
  TimeStat,
  | "total_faltas_cometidas"
  | "total_faltas_sofridas"
  | "total_cartoes_amarelos"
  | "total_cartoes_vermelhos"
  | "total_cartoes_vermelhos_indiretos"
  | "total_impedimentos"
  | "media_faltas_cometidas"
  | "media_cartoes_amarelos"
>;

/* ── Constants ───────────────────────────────────────────────────────── */

const KPI_DEFS: { key: KpiKey; label: string; short: string }[] = [
  { key: "total_faltas_cometidas",            label: "Total Faltas Cometidas",   short: "T.F.Com"   },
  { key: "total_faltas_sofridas",             label: "Total Faltas Sofridas",    short: "T.F.Sof"   },
  { key: "total_cartoes_amarelos",            label: "Total Cartões Amarelos",   short: "T.C.Amar"  },
  { key: "total_cartoes_vermelhos",           label: "Total Cartões Vermelhos",  short: "T.C.Verm"  },
  { key: "total_cartoes_vermelhos_indiretos", label: "Total V. Vermelhos Ind.",  short: "T.C.V.Ind" },
  { key: "total_impedimentos",                label: "Total Impedimentos",       short: "T.Imped"   },
  { key: "media_faltas_cometidas",            label: "Média Faltas Cometidas",   short: "M.F.Com"   },
  { key: "media_cartoes_amarelos",            label: "Média Cartões Amarelos",   short: "M.C.Amar"  },
];

const KPI_COLORS = ["#10b981", "#f97316", "#3b82f6"] as const;

/* ── SVG geometry ────────────────────────────────────────────────────── */

const SVG_W   = 820;
const SVG_H   = 400;
const PAD_L   = 2;   // labels do eixo Y ficam dentro do gráfico
const PAD_R   = 48;  // espaço para labels de avg à direita
const PAD_T   = 28;
const PAD_B   = 72;
const CHART_W = SVG_W - PAD_L - PAD_R;
const CHART_H = SVG_H - PAD_T - PAD_B;

/* ── Helpers ─────────────────────────────────────────────────────────── */

function clip(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function fmtVal(v: number, key: KpiKey) {
  return key.startsWith("media_") ? v.toFixed(1) : String(Math.round(v));
}

/* ── Grouped Bar Chart SVG ───────────────────────────────────────────── */

interface BarChartProps {
  teams: TimeStat[];
  kpis: KpiKey[];
  uMax: Record<KpiKey, number>;
  uAvg: Record<KpiKey, number>;
}

function GroupedBarChart({ teams, kpis, uMax, uAvg }: BarChartProps) {
  const N = teams.length;
  const M = kpis.length;

  if (N === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-gray-500 text-sm">
        Nenhuma seleção encontrada.
      </div>
    );
  }

  const TICKS  = 5;
  const yTicks = Array.from({ length: TICKS + 1 }, (_, i) => Math.round((100 * i) / TICKS));

  const GROUP_W      = CHART_W / N;
  const INNER_FILL   = 0.80;
  const GROUP_INNER  = GROUP_W * INNER_FILL;
  const GROUP_OFFSET = (GROUP_W - GROUP_INNER) / 2;
  const BAR_W        = GROUP_INNER / M;
  const BAR_GAP      = 1.5;

  const toY = (pct: number) => PAD_T + CHART_H - (pct / 100) * CHART_H;
  const toH = (pct: number) => (pct / 100) * CHART_H;

  // Font size for value label adapts to bar width
  const valueFontSize = BAR_W > 30 ? 10 : BAR_W > 20 ? 9 : 8;
  const nameFontSize  = N > 7 ? 8 : 9;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: 400 }}>

      {/* Grid lines + Y labels sobrepostos (inside chart) */}
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD_L} y1={toY(tick)} x2={PAD_L + CHART_W} y2={toY(tick)}
            stroke={tick === 0 ? "#374151" : "#1f2937"} strokeWidth="1"
          />
          {tick > 0 && (
            <text x={PAD_L + 4} y={toY(tick) - 3}
              textAnchor="start" fill="#4b5563" fontSize="9">
              {tick}%
            </text>
          )}
        </g>
      ))}

      {/* Universe avg reference lines (one per KPI) */}
      {kpis.map((key, ki) => {
        const avgPct = uMax[key] > 0 ? (uAvg[key] / uMax[key]) * 100 : 0;
        const y = toY(avgPct);
        return (
          <g key={String(key)}>
            <line
              x1={PAD_L} y1={y} x2={PAD_L + CHART_W} y2={y}
              stroke={KPI_COLORS[ki]} strokeWidth="1.2"
              strokeDasharray="7 3" opacity={0.55}
            />
            <text x={PAD_L + CHART_W + 5} y={y + 4}
              fill={KPI_COLORS[ki]} fontSize="9" opacity={0.7}>
              avg {ki + 1}
            </text>
          </g>
        );
      })}

      {/* Grouped bars */}
      {teams.map((t, i) => {
        const groupX = PAD_L + i * GROUP_W + GROUP_OFFSET;
        const cx     = PAD_L + i * GROUP_W + GROUP_W / 2;

        return (
          <g key={t.pais}>
            {kpis.map((key, ki) => {
              const val    = Number(t[key]) || 0;
              const pct    = uMax[key] > 0 ? Math.min((val / uMax[key]) * 100, 100) : 0;
              const bx     = groupX + ki * BAR_W + BAR_GAP / 2;
              const bw     = BAR_W - BAR_GAP;
              const bh     = toH(pct);
              const by     = toY(pct);
              const color  = KPI_COLORS[ki];

              return (
                <g key={String(key)}>
                  {/* Bar */}
                  <rect x={bx.toFixed(1)} y={by.toFixed(1)}
                    width={Math.max(bw, 0).toFixed(1)} height={bh.toFixed(1)}
                    fill={color} opacity={0.82} rx={2} />
                  {/* Value label above bar */}
                  {bh > 10 && (
                    <text
                      x={(bx + bw / 2).toFixed(1)}
                      y={(by - 3).toFixed(1)}
                      textAnchor="middle"
                      fill={color}
                      fontSize={valueFontSize}
                      fontWeight="600"
                    >
                      {fmtVal(val, key)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Team name (rotated) */}
            <text
              x={cx.toFixed(1)}
              y={(PAD_T + CHART_H + 14).toFixed(1)}
              textAnchor="end"
              fill="#e5e7eb"
              fontSize={nameFontSize}
              fontWeight="500"
              transform={`rotate(-38, ${cx.toFixed(1)}, ${(PAD_T + CHART_H + 14).toFixed(1)})`}
            >
              {clip(t.pais, 16)}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + CHART_H}
        stroke="#374151" strokeWidth="1" />
      <line x1={PAD_L} y1={PAD_T + CHART_H} x2={PAD_L + CHART_W} y2={PAD_T + CHART_H}
        stroke="#374151" strokeWidth="1" />
    </svg>
  );
}

/* ── Stats Table ─────────────────────────────────────────────────────── */

function StatsTable({ teams, kpis }: { teams: TimeStat[]; kpis: KpiKey[] }) {
  if (teams.length === 0) return null;
  return (
    <div className="overflow-auto rounded-lg border border-gray-700/50 h-full">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="bg-gray-800 text-gray-400 uppercase tracking-wide">
            <th className="px-3 py-2 w-7">#</th>
            <th className="px-3 py-2">Seleção</th>
            <th className="px-3 py-2 text-center w-10">Jog</th>
            {kpis.map((k, ki) => (
              <th key={String(k)} className="px-3 py-2 text-right whitespace-nowrap"
                style={{ color: KPI_COLORS[ki] }}>
                {KPI_DEFS.find((d) => d.key === k)?.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {teams.map((t, idx) => (
            <tr key={t.pais} className="hover:bg-gray-800/50 transition-colors">
              <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
              <td className="px-3 py-2 font-semibold text-white">{t.pais}</td>
              <td className="px-3 py-2 text-center text-gray-400">{t.total_jogadores}</td>
              {kpis.map((k, ki) => (
                <td key={String(k)} className="px-3 py-2 text-right font-mono font-semibold"
                  style={{ color: KPI_COLORS[ki] }}>
                  {fmtVal(Number(t[k]) || 0, k)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────── */

export default function TeamChart({ times }: { times: TimeStat[] }) {
  const [kpis,       setKpis]       = useState<KpiKey[]>(["total_faltas_cometidas"]);
  const [nameSearch, setNameSearch] = useState<string>("");

  const primaryKpi = kpis[0];

  /* ── Universe max + avg per KPI ──────────────────────────────── */

  const uMax = useMemo(() => {
    const r = {} as Record<KpiKey, number>;
    for (const { key } of KPI_DEFS) {
      r[key] = Math.max(...times.map((t) => Number(t[key]) || 0), 1);
    }
    return r;
  }, [times]);

  const uAvg = useMemo(() => {
    const r = {} as Record<KpiKey, number>;
    for (const { key } of KPI_DEFS) {
      const vals = times.map((t) => Number(t[key]) || 0);
      r[key] = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    }
    return r;
  }, [times]);

  /* ── Pinned teams (name search) ──────────────────────────────── */

  const pinned = useMemo(() => {
    if (!nameSearch.trim()) return [];
    const q = nameSearch.toLowerCase();
    return times.filter((t) => t.pais.toLowerCase().includes(q)).slice(0, 10);
  }, [times, nameSearch]);

  /* ── Chart teams: pinned ∪ top-N, max 10, sorted by primary KPI ─ */

  const chartTeams = useMemo(() => {
    const pinnedNames = new Set(pinned.map((t) => t.pais));
    const slots = Math.max(0, 15 - Math.min(pinned.length, 15));
    const topRest = times
      .filter((t) => !pinnedNames.has(t.pais))
      .sort((a, b) => (Number(b[primaryKpi]) || 0) - (Number(a[primaryKpi]) || 0))
      .slice(0, slots);
    return [...pinned, ...topRest]
      .slice(0, 15)
      .sort((a, b) => (Number(b[primaryKpi]) || 0) - (Number(a[primaryKpi]) || 0));
  }, [pinned, times, primaryKpi]);

  /* ── KPI toggle ──────────────────────────────────────────────── */

  function toggleKpi(key: KpiKey) {
    if (kpis.includes(key)) {
      if (kpis.length > 1) setKpis(kpis.filter((k) => k !== key));
    } else if (kpis.length < 3) {
      setKpis([...kpis, key]);
    }
  }

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">

      {/* ── Filter bar ──────────────────────────────────────────── */}
      <div className="bg-gray-800/60 rounded-xl p-4 space-y-3 border border-gray-700/40">

        {/* KPI pills */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] uppercase tracking-widest text-gray-500">KPIs</p>
            <span className="text-[10px] text-gray-600">
              ({kpis.length}/3 · ordenação pelo 1º)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {KPI_DEFS.map(({ key, label }) => {
              const idx        = kpis.indexOf(key);
              const isSelected = idx !== -1;
              const isDisabled = !isSelected && kpis.length >= 3;
              const color      = isSelected ? KPI_COLORS[idx] : undefined;
              return (
                <button
                  key={String(key)}
                  onClick={() => toggleKpi(key)}
                  disabled={isDisabled}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    isSelected
                      ? "text-white border-transparent"
                      : isDisabled
                      ? "bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed"
                      : "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                  }`}
                  style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                >
                  {isSelected && (
                    <span className="mr-1 font-bold opacity-75">{idx + 1}·</span>
                  )}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Team search */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[220px] max-w-sm">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">
              Seleção <span className="text-emerald-600">(fixa no gráfico)</span>
            </p>
            <input
              type="text"
              placeholder="Buscar e fixar seleção…"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="text-xs text-gray-500 pb-1.5">
            <span className="text-gray-300 font-semibold">{chartTeams.length}</span>/15 no gráfico
            {pinned.length > 0 && (
              <span className="text-emerald-500 ml-1">
                · {pinned.length} fixo{pinned.length > 1 ? "s" : ""}
              </span>
            )}
            <span className="text-gray-600 ml-2">de {times.length} seleções</span>
          </div>
        </div>
      </div>

      {/* ── Gráfico de colunas agrupadas (largura total) ────────── */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 pt-4 pb-3">
        {/* Legend com padding igual ao filtro */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 mb-3">
          {kpis.map((k, ki) => (
            <span key={String(k)} className="flex items-center gap-2 text-xs">
              <span className="w-4 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: KPI_COLORS[ki] }} />
              <span style={{ color: KPI_COLORS[ki] }}>
                {ki + 1}. {KPI_DEFS.find((d) => d.key === k)?.label}
              </span>
            </span>
          ))}
          <span className="text-[10px] text-gray-600 ml-auto">
            % normalizado pelo máx do universo · --- média
          </span>
        </div>

        {/* SVG com margem mínima nas laterais */}
        <div className="px-1">
          <GroupedBarChart
            teams={chartTeams}
            kpis={kpis}
            uMax={uMax}
            uAvg={uAvg}
          />
        </div>
      </div>
    </div>
  );
}
