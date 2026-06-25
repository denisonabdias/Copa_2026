"use client";

import { useState, useMemo } from "react";
import type { Jogador } from "@/lib/supabase";

/* ── Config ──────────────────────────────────────────────────────────── */

const KPIs: { key: keyof Jogador; label: string }[] = [
  { key: "faltas_cometidas",            label: "Faltas Cometidas" },
  { key: "faltas_sofridas",             label: "Faltas Sofridas" },
  { key: "cartoes_amarelos",            label: "Cartões Amarelos" },
  { key: "cartoes_vermelhos",           label: "Cartões Vermelhos" },
  { key: "cartoes_vermelhos_indiretos", label: "V. Vermelhos Ind." },
  { key: "impedimentos",                label: "Impedimentos" },
];

const POS_COLOR: Record<string, string> = {
  FW: "#f97316",
  MF: "#3b82f6",
  DF: "#10b981",
  GK: "#a855f7",
};

const POS_LABEL: Record<string, string> = {
  FW: "Atacante",
  MF: "Meia",
  DF: "Defensor",
  GK: "Goleiro",
};

/* ── Chart geometry (SVG viewBox coordinates) ───────────────────────── */

const SVG_W = 820;
const SVG_H = 400;
const PAD_L = 48;
const PAD_R = 140;
const PAD_T = 28;
const PAD_B = 104;
const CHART_W = SVG_W - PAD_L - PAD_R;
const CHART_H = SVG_H - PAD_T - PAD_B;

/* ── Helpers ─────────────────────────────────────────────────────────── */

function mean(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function clip(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/* ── SVG Bar Chart ───────────────────────────────────────────────────── */

interface ChartProps {
  data: Jogador[];
  kpiKey: keyof Jogador;
  clusterAvg: number;
  clusterMin: number;
  universeAvg: number;
}

function BarChart({ data, kpiKey, clusterAvg, clusterMin, universeAvg }: ChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-gray-500 text-sm">
        Nenhum jogador encontrado com os filtros selecionados.
      </div>
    );
  }

  const values  = data.map((j) => Number(j[kpiKey]) || 0);
  const maxVal  = Math.max(...values, 1);
  const yMax    = maxVal * 1.18;

  const toY = (v: number) => PAD_T + CHART_H - (v / yMax) * CHART_H;
  const toH = (v: number) => Math.max((v / yMax) * CHART_H, 0);

  const n          = data.length;
  const GROUP_W    = CHART_W / n;
  const BAR_W      = GROUP_W * 0.58;
  const BAR_OFFSET = (GROUP_W - BAR_W) / 2;

  // Y-axis grid ticks
  const TICKS  = 5;
  const yTicks = Array.from({ length: TICKS + 1 }, (_, i) =>
    Math.round((yMax * i) / TICKS)
  );

  // Reference lines: deduplicate by value proximity (avoid overlapping labels)
  const refLines = [
    { v: maxVal,     color: "#10b981", dash: "6 3", label: `Máx: ${maxVal}`,                    opacity: 0.6  },
    { v: clusterMin, color: "#ef4444", dash: "6 3", label: `Mín: ${clusterMin}`,                opacity: 0.6  },
    { v: clusterAvg, color: "#f97316", dash: "9 4", label: `Média cluster: ${clusterAvg.toFixed(1)}`, opacity: 0.85 },
    { v: universeAvg,color: "#60a5fa", dash: "9 4", label: `Média geral: ${universeAvg.toFixed(1)}`,  opacity: 0.75 },
  ].filter((r) => r.v > 0 && r.v <= yMax * 1.01);

  // Font size adapts to number of bars
  const nameFontSize = n >= 9 ? 8 : n >= 7 ? 9 : 10;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: 420 }}>

      {/* Grid lines + Y-axis labels */}
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD_L} y1={toY(tick)} x2={PAD_L + CHART_W} y2={toY(tick)}
            stroke="#1f2937" strokeWidth="1"
          />
          <text x={PAD_L - 6} y={toY(tick) + 4} textAnchor="end" fill="#4b5563" fontSize="11">
            {tick}
          </text>
        </g>
      ))}

      {/* Reference dashed lines */}
      {refLines.map((ref, i) => {
        const y = toY(ref.v);
        return (
          <g key={i}>
            <line
              x1={PAD_L} y1={y} x2={PAD_L + CHART_W} y2={y}
              stroke={ref.color} strokeWidth="1.5"
              strokeDasharray={ref.dash} opacity={ref.opacity}
            />
            <text
              x={PAD_L + CHART_W + 8} y={y + 4}
              fill={ref.color} fontSize="10" opacity={Math.min(ref.opacity + 0.15, 1)}
            >
              {ref.label}
            </text>
          </g>
        );
      })}

      {/* Bars + X-axis labels */}
      {data.map((j, i) => {
        const val   = Number(j[kpiKey]) || 0;
        const x     = PAD_L + i * GROUP_W + BAR_OFFSET;
        const y     = toY(val);
        const h     = toH(val);
        const color = POS_COLOR[j.posicao_campo] ?? "#6b7280";
        const cx    = x + BAR_W / 2;

        // Split name: last token as surname highlight
        const parts   = j.nome.trim().split(/\s+/);
        const surname = clip(parts[parts.length - 1], 12);
        const first   = parts.length > 1 ? clip(parts.slice(0, -1).join(" "), 12) : "";

        const yBase = PAD_T + CHART_H;

        return (
          <g key={j.id}>
            {/* Bar body */}
            <rect x={x} y={y} width={BAR_W} height={h} fill={color} opacity={0.82} rx={3} />
            {/* Lighter top accent */}
            <rect x={x} y={y} width={BAR_W} height={Math.min(4, h)} fill={color} opacity={0.4} rx={3} />

            {/* Value label above bar */}
            {val > 0 && (
              <text x={cx} y={y - 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="700">
                {val}
              </text>
            )}

            {/* Surname (bold) */}
            <text x={cx} y={yBase + 14} textAnchor="middle" fill="#f3f4f6" fontSize={nameFontSize} fontWeight="600">
              {surname}
            </text>
            {/* First name */}
            {first && (
              <text x={cx} y={yBase + 24} textAnchor="middle" fill="#9ca3af" fontSize={nameFontSize - 1}>
                {first}
              </text>
            )}
            {/* Position tag */}
            <text x={cx} y={yBase + 38} textAnchor="middle" fill={color} fontSize="9" fontWeight="700">
              {j.posicao_campo}
            </text>
            {/* Country */}
            <text x={cx} y={yBase + 50} textAnchor="middle" fill="#6b7280" fontSize="8">
              {clip(j.pais, 12)}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + CHART_H} stroke="#374151" strokeWidth="1" />
      <line x1={PAD_L} y1={PAD_T + CHART_H} x2={PAD_L + CHART_W} y2={PAD_T + CHART_H} stroke="#374151" strokeWidth="1" />
    </svg>
  );
}

/* ── Main component ───────────────────────────────────────────────────── */

export default function PlayerChart({ jogadores }: { jogadores: Jogador[] }) {
  const [kpi,        setKpi]        = useState<keyof Jogador>("faltas_cometidas");
  const [position,   setPosition]   = useState<string>("all");
  const [team,       setTeam]       = useState<string>("all");
  const [nameSearch, setNameSearch] = useState<string>("");

  // Unique countries sorted
  const countries = useMemo(
    () => [...new Set(jogadores.map((j) => j.pais))].sort(),
    [jogadores]
  );

  // Universe avg (all players, selected KPI)
  const universeAvg = useMemo(() => {
    const vals = jogadores.map((j) => Number(j[kpi]) || 0);
    return mean(vals);
  }, [jogadores, kpi]);

  // Filtered + sorted by selected KPI descending
  const filtered = useMemo(() => {
    const q = nameSearch.toLowerCase();
    return jogadores
      .filter(
        (j) =>
          (position === "all" || j.posicao_campo === position) &&
          (team     === "all" || j.pais           === team)    &&
          (q        === ""    || j.nome.toLowerCase().includes(q))
      )
      .sort((a, b) => (Number(b[kpi]) || 0) - (Number(a[kpi]) || 0));
  }, [jogadores, kpi, position, team, nameSearch]);

  const chartData   = filtered.slice(0, 10);
  const clusterVals = filtered.map((j) => Number(j[kpi]) || 0);
  const clusterAvg  = mean(clusterVals);
  const clusterMin  = clusterVals.length ? Math.min(...clusterVals) : 0;
  const kpiLabel    = KPIs.find((k) => k.key === kpi)?.label ?? "";

  return (
    <div className="space-y-4">

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <div className="bg-gray-800/60 rounded-xl p-4 space-y-3 border border-gray-700/40">

        {/* KPI pills */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">KPI</p>
          <div className="flex flex-wrap gap-2">
            {KPIs.map((k) => (
              <button
                key={String(k.key)}
                onClick={() => setKpi(k.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  kpi === k.key
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        {/* Position + Team + Name search */}
        <div className="flex flex-wrap gap-4 items-end">

          {/* Position filter */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Posição</p>
            <div className="flex gap-1">
              {(["all", "FW", "MF", "DF", "GK"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors border ${
                    position === p
                      ? "border-transparent text-white"
                      : "border-gray-600 bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                  style={
                    position === p
                      ? p === "all"
                        ? { backgroundColor: "#4b5563" }
                        : { backgroundColor: POS_COLOR[p] }
                      : {}
                  }
                >
                  {p === "all" ? "Todas" : p}
                </button>
              ))}
            </div>
          </div>

          {/* Team dropdown */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Seleção</p>
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Todas as seleções</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Name search */}
          <div className="flex-1 min-w-[180px]">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Jogador</p>
            <input
              type="text"
              placeholder="Buscar pelo nome…"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Result count badge */}
          <div className="text-xs text-gray-500 pb-1.5">
            <span className="text-gray-300 font-semibold">{filtered.length}</span> jogadores
            {filtered.length > 10 && (
              <span className="text-gray-500"> · top 10 no gráfico</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Chart panel ─────────────────────────────────────────────── */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 px-4 pt-4 pb-2">

        {/* Chart header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{kpiLabel}</h3>
            {position !== "all" && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{
                  backgroundColor: POS_COLOR[position] + "25",
                  color: POS_COLOR[position],
                  border: `1px solid ${POS_COLOR[position]}40`,
                }}
              >
                {POS_LABEL[position] ?? position}
              </span>
            )}
            {team !== "all" && (
              <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                {team}
              </span>
            )}
          </div>

          {/* Reference lines legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
            {[
              { color: "#10b981", label: "Máx cluster" },
              { color: "#ef4444", label: "Mín cluster" },
              { color: "#f97316", label: "Média cluster" },
              { color: "#60a5fa", label: "Média geral" },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <svg width="18" height="8" className="shrink-0">
                  <line x1="0" y1="4" x2="18" y2="4"
                    stroke={l.color} strokeWidth="1.5" strokeDasharray="5 2" />
                </svg>
                {l.label}
              </span>
            ))}
          </div>
        </div>

        <BarChart
          data={chartData}
          kpiKey={kpi}
          clusterAvg={clusterAvg}
          clusterMin={clusterMin}
          universeAvg={universeAvg}
        />
      </div>

      {/* ── Position legend ──────────────────────────────────────────── */}
      <div className="flex gap-5 text-xs flex-wrap">
        {Object.entries(POS_COLOR).map(([p, c]) => (
          <span key={p} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: c }} />
            <span className="text-gray-400">{p} · {POS_LABEL[p]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
