"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { Jogador } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────────────────────────── */

type KpiKey = keyof Pick<
  Jogador,
  | "faltas_cometidas"
  | "faltas_sofridas"
  | "cartoes_amarelos"
  | "cartoes_vermelhos"
  | "cartoes_vermelhos_indiretos"
  | "impedimentos"
>;

/* ── Constants ───────────────────────────────────────────────────────── */

const KPI_DEFS: { key: KpiKey; label: string; short: string }[] = [
  { key: "faltas_cometidas",            label: "Faltas Cometidas",    short: "F.Com"   },
  { key: "faltas_sofridas",             label: "Faltas Sofridas",     short: "F.Sof"   },
  { key: "cartoes_amarelos",            label: "Cartões Amarelos",    short: "C.Amar"  },
  { key: "cartoes_vermelhos",           label: "Cartões Vermelhos",   short: "C.Verm"  },
  { key: "cartoes_vermelhos_indiretos", label: "V. Vermelhos Ind.",   short: "C.V.Ind" },
  { key: "impedimentos",                label: "Impedimentos",        short: "Imped"   },
];

const KPI_COLORS = ["#10b981", "#f97316", "#3b82f6"] as const;

const POS_COLOR: Record<string, string> = {
  FW: "#f97316", MF: "#3b82f6", DF: "#10b981", GK: "#a855f7",
};
const POS_LABEL: Record<string, string> = {
  FW: "Atacante", MF: "Meia", DF: "Defensor", GK: "Goleiro",
};

/* ── SVG geometry ────────────────────────────────────────────────────── */

const SVG_W   = 760;
const SVG_H   = 560;
const CX      = 380;
const CY      = 268;
const R       = 172;
const LABEL_R = R + 44;

/* ── Helpers ─────────────────────────────────────────────────────────── */

function clip(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function lastName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

function rAngle(i: number, n: number) {
  return -Math.PI / 2 + (2 * Math.PI * i) / n;
}

function rPoint(i: number, n: number, norm: number) {
  const a = rAngle(i, n);
  return { x: CX + norm * R * Math.cos(a), y: CY + norm * R * Math.sin(a) };
}

function toPoints(pts: { x: number; y: number }[]) {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/* ── TeamMultiSelect ─────────────────────────────────────────────────── */

function TeamMultiSelect({
  countries, selected, onChange,
}: {
  countries: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, []);

  function toggle(c: string) {
    onChange(selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c]);
  }

  const label =
    selected.length === 0 ? "Todas as seleções"
    : selected.length <= 3 ? selected.join(", ")
    : `${selected.slice(0, 2).join(", ")} +${selected.length - 2}`;

  return (
    <div ref={ref} className="relative">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Seleção</p>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-gray-700 border border-gray-600 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 min-w-[190px] max-w-[280px] hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <svg className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-56 bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
            <span className="text-xs text-gray-400">
              {selected.length === 0 ? "Todas" : `${selected.length} selecionadas`}
            </span>
            {selected.length > 0 && (
              <button onClick={() => { onChange([]); setOpen(false); }}
                className="text-xs text-emerald-400 hover:text-emerald-300">
                Limpar
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-52 py-1">
            {countries.map((c) => (
              <label key={c}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700 cursor-pointer">
                <input type="checkbox" checked={selected.includes(c)} onChange={() => toggle(c)}
                  className="accent-emerald-500 w-3 h-3 shrink-0" />
                <span className="text-xs text-gray-200">{c}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Radar Chart ─────────────────────────────────────────────────────── */

interface RadarProps {
  players: Jogador[];
  kpis: KpiKey[];
  uMax: Record<KpiKey, number>;
}

function RadarChart({ players, kpis, uMax }: RadarProps) {
  const N = players.length;

  if (N === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-gray-500 text-sm">
        Nenhum jogador encontrado com os filtros selecionados.
      </div>
    );
  }
  if (N < 3) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-sm gap-1">
        <span>Adicione pelo menos 3 jogadores para exibir o radar.</span>
        <span className="text-xs">({N} jogador{N > 1 ? "es" : ""} no momento)</span>
      </div>
    );
  }

  const RINGS = [0.25, 0.5, 0.75, 1.0];

  function ringPts(frac: number) {
    return toPoints(Array.from({ length: N }, (_, i) => rPoint(i, N, frac)));
  }

  function kpiPts(key: KpiKey) {
    const max = uMax[key] || 1;
    return toPoints(players.map((j, i) => rPoint(i, N, Math.min((j[key] || 0) / max, 1))));
  }

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: 540 }}>

      {/* Axis lines */}
      {Array.from({ length: N }, (_, i) => {
        const outer = rPoint(i, N, 1);
        return (
          <line key={i} x1={CX} y1={CY}
            x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
            stroke="#374151" strokeWidth="1" />
        );
      })}

      {/* Concentric grid polygons */}
      {RINGS.map((frac) => (
        <polygon key={frac} points={ringPts(frac)}
          fill="none" stroke={frac === 1 ? "#374151" : "#1f2937"}
          strokeWidth={frac === 1 ? "1.5" : "1"} />
      ))}

      {/* Scale % labels along first axis (top) */}
      {RINGS.slice(0, -1).map((frac) => {
        const p = rPoint(0, N, frac);
        return (
          <text key={frac} x={(p.x - 5).toFixed(1)} y={(p.y + 3).toFixed(1)}
            textAnchor="end" fill="#4b5563" fontSize="9">
            {Math.round(frac * 100)}%
          </text>
        );
      })}

      {/* KPI polygons */}
      {kpis.map((key, ki) => {
        const color = KPI_COLORS[ki];
        const max   = uMax[key] || 1;
        return (
          <g key={String(key)}>
            <polygon points={kpiPts(key)}
              fill={color} fillOpacity={0.12 + ki * 0.04}
              stroke={color} strokeWidth="2" strokeOpacity="0.9" />
            {players.map((j, i) => {
              const norm = Math.min((j[key] || 0) / max, 1);
              const p    = rPoint(i, N, norm);
              return (
                <circle key={j.id} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
                  r="3.5" fill={color} stroke="#0f172a" strokeWidth="1.5" />
              );
            })}
          </g>
        );
      })}

      {/* Vertex labels */}
      {players.map((j, i) => {
        const a      = rAngle(i, N);
        const cosA   = Math.cos(a);
        const sinA   = Math.sin(a);
        const lx     = CX + LABEL_R * cosA;
        const ly     = CY + LABEL_R * sinA;
        const anchor = cosA > 0.15 ? "start" : cosA < -0.15 ? "end" : "middle";
        const posCol = POS_COLOR[j.posicao_campo] ?? "#6b7280";

        // vertical nudge: push label up for top vertices, down for bottom
        const vy = sinA < -0.4 ? -14 : sinA > 0.4 ? 6 : -5;

        const dot = rPoint(i, N, 1);
        return (
          <g key={j.id}>
            <circle cx={dot.x.toFixed(1)} cy={dot.y.toFixed(1)} r="3" fill="#4b5563" />
            <text x={lx.toFixed(1)} y={(ly + vy).toFixed(1)}
              textAnchor={anchor} fill="#f3f4f6" fontSize="11" fontWeight="600">
              {clip(lastName(j.nome), 13)}
            </text>
            <text x={lx.toFixed(1)} y={(ly + vy + 13).toFixed(1)}
              textAnchor={anchor} fill={posCol} fontSize="9" fontWeight="600">
              {j.posicao_campo} · {clip(j.pais, 11)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Stats Table ─────────────────────────────────────────────────────── */

function StatsTable({ players, kpis }: { players: Jogador[]; kpis: KpiKey[] }) {
  if (players.length === 0) return null;
  return (
    <div className="overflow-auto rounded-lg border border-gray-700/50 h-full">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="bg-gray-800 text-gray-400 uppercase tracking-wide">
            <th className="px-3 py-2 w-7">#</th>
            <th className="px-3 py-2">Jogador</th>
            <th className="px-3 py-2">País</th>
            <th className="px-3 py-2 w-12">Pos</th>
            {kpis.map((k, ki) => (
              <th key={String(k)} className="px-3 py-2 text-right whitespace-nowrap"
                style={{ color: KPI_COLORS[ki] }}>
                {KPI_DEFS.find((d) => d.key === k)?.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {players.map((j, idx) => (
            <tr key={j.id} className="hover:bg-gray-800/50 transition-colors">
              <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
              <td className="px-3 py-2 font-medium text-white">{j.nome}</td>
              <td className="px-3 py-2 text-gray-300">{j.pais}</td>
              <td className="px-3 py-2">
                <span className="px-1.5 py-0.5 rounded text-white text-xs"
                  style={{ backgroundColor: POS_COLOR[j.posicao_campo] ?? "#6b7280" }}>
                  {j.posicao_campo}
                </span>
              </td>
              {kpis.map((k, ki) => (
                <td key={String(k)} className="px-3 py-2 text-right font-mono font-semibold"
                  style={{ color: KPI_COLORS[ki] }}>
                  {j[k] ?? 0}
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function PlayerChart({ jogadores, lastUpdated }: { jogadores: Jogador[]; lastUpdated: string | null }) {
  const [kpis,       setKpis]       = useState<KpiKey[]>(["faltas_cometidas"]);
  const [position,   setPosition]   = useState<string>("all");
  const [teams,      setTeams]      = useState<string[]>([]);
  const [nameSearch, setNameSearch] = useState<string>("");

  /* ── Derived ────────────────────────────────────────────────────── */

  const countries = useMemo(
    () => [...new Set(jogadores.map((j) => j.pais))].sort(),
    [jogadores],
  );

  const uMax = useMemo(() => {
    const r = {} as Record<KpiKey, number>;
    for (const { key } of KPI_DEFS) {
      r[key] = Math.max(...jogadores.map((j) => j[key] || 0), 1);
    }
    return r;
  }, [jogadores]);

  const primaryKpi = kpis[0];

  // Players pinned by name search (from entire dataset, by ranking)
  const pinned = useMemo(() => {
    if (!nameSearch.trim()) return [];
    const q = nameSearch.toLowerCase();
    return jogadores
      .filter((j) => j.nome.toLowerCase().includes(q))
      .slice(0, 10);
  }, [jogadores, nameSearch]);

  // Players matching position + team filters
  const filtered = useMemo(() => {
    return jogadores.filter(
      (j) =>
        (position === "all" || j.posicao_campo === position) &&
        (teams.length === 0 || teams.includes(j.pais)),
    );
  }, [jogadores, position, teams]);

  // Final chart players: pinned ∪ top-N-filtered, sorted by primary KPI desc, max 10
  const chartPlayers = useMemo(() => {
    const pinnedIds = new Set(pinned.map((j) => j.id));
    const slots     = Math.max(0, 10 - Math.min(pinned.length, 10));
    const topRest   = filtered
      .filter((j) => !pinnedIds.has(j.id))
      .sort((a, b) => (b[primaryKpi] || 0) - (a[primaryKpi] || 0))
      .slice(0, slots);
    return [...pinned, ...topRest]
      .slice(0, 10)
      .sort((a, b) => (b[primaryKpi] || 0) - (a[primaryKpi] || 0));
  }, [pinned, filtered, primaryKpi]);

  /* ── KPI toggle (max 3, min 1) ──────────────────────────────────── */

  function toggleKpi(key: KpiKey) {
    if (kpis.includes(key)) {
      if (kpis.length > 1) setKpis(kpis.filter((k) => k !== key));
    } else if (kpis.length < 3) {
      setKpis([...kpis, key]);
    }
  }

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">

      {/* ── Filter bar ────────────────────────────────────────────── */}
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

        {/* Filters row */}
        <div className="flex flex-wrap gap-4 items-end">

          {/* Position */}
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
                  style={position === p
                    ? { backgroundColor: p === "all" ? "#4b5563" : POS_COLOR[p] }
                    : {}}
                >
                  {p === "all" ? "Todas" : p}
                </button>
              ))}
            </div>
          </div>

          {/* Team multi-select */}
          <TeamMultiSelect countries={countries} selected={teams} onChange={setTeams} />

          {/* Name search */}
          <div className="flex-1 min-w-[180px]">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">
              Jogador <span className="text-emerald-600">(fixa no radar)</span>
            </p>
            <input
              type="text"
              placeholder="Buscar e fixar jogador…"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Count */}
          <div className="text-xs text-gray-500 pb-1.5">
            <span className="text-gray-300 font-semibold">{chartPlayers.length}</span>/10 no radar
            {pinned.length > 0 && (
              <span className="text-emerald-500 ml-1">
                · {pinned.length} fixo{pinned.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Radar + Tabela lado a lado ──────────────────────────── */}
      <div className="flex gap-4 items-start">

        {/* Radar (esquerda) */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 px-4 pt-4 pb-3 flex-1 min-w-0">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-3">
            {kpis.map((k, ki) => (
              <span key={String(k)} className="flex items-center gap-2 text-xs">
                <svg width="20" height="8">
                  <line x1="0" y1="4" x2="20" y2="4"
                    stroke={KPI_COLORS[ki]} strokeWidth="2" />
                </svg>
                <span style={{ color: KPI_COLORS[ki] }}>
                  {ki + 1}. {KPI_DEFS.find((d) => d.key === k)?.label}
                </span>
              </span>
            ))}
            <span className="text-[10px] text-gray-600 ml-auto">
              % normalizado pelo máx do universo total
            </span>
          </div>
          <RadarChart players={chartPlayers} kpis={kpis} uMax={uMax} />
        </div>

        {/* Tabela (direita) */}
        <div className="w-[420px] shrink-0 self-stretch">
          <StatsTable players={chartPlayers} kpis={kpis} />
        </div>
      </div>

      {/* ── Position legend ───────────────────────────────────────── */}
      <div className="flex gap-5 text-xs flex-wrap">
        {Object.entries(POS_COLOR).map(([p, c]) => (
          <span key={p} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: c }} />
            <span className="text-gray-400">{p} · {POS_LABEL[p]}</span>
          </span>
        ))}
      </div>

      {/* ── Rodapé ───────────────────────────────────────────────── */}
      <p className="text-[10px] text-gray-600 mt-1">
        Fonte: fifa.com
        {lastUpdated && (
          <> · Extração: {fmtDate(lastUpdated)}</>
        )}
      </p>
    </div>
  );
}
