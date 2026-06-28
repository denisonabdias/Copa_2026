"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { JogadorCompleto } from "@/lib/supabase";

/* ── Types ───────────────────────────────────────────────────────────── */

type KpiKey = keyof Pick<
  JogadorCompleto,
  // Artilharia
  | "gols" | "assistencias_artilharia" | "minutos_jogados"
  // Ataque
  | "finalizacoes_certas" | "finalizacoes" | "assistencias_ataque"
  | "chutes_na_area" | "chutes_fora_area" | "cabeceos_a_gol"
  | "ge" | "eficiencia_ge" | "escanteios"
  // Defesa
  | "perdas_bola_forcadas" | "pressoes_defensivas" | "pressoes_defensivas_diretas" | "gols_contra"
  // Disciplina
  | "faltas_cometidas" | "faltas_sofridas" | "cartoes_amarelos"
  | "cartoes_vermelhos" | "cartoes_vermelhos_indiretos" | "impedimentos"
  // Distribuicao
  | "passes" | "precisao_passes_pct" | "cruzamentos"
  | "tentativas_ruptura_linha" | "tentativas_mudanca_direcao"
  // Fisico
  | "velocidade_media" | "corridas_alta_velocidade" | "arrancadas" | "distancia_total"
  // Goleiro
  | "defesas_goleiro" | "acoes_goleiro_dentro_area" | "acoes_goleiro_fora_area"
  // Movimentacao
  | "pedidos_bola" | "pedidos_frente" | "pedidos_entre"
  | "recepcoes_entre_linhas" | "recepcoes_sob_pressao" | "participacoes"
>;

type KpiDef      = { key: KpiKey; label: string; short: string };
type KpiCategory = { cat: string; kpis: KpiDef[] };

type RefVertex = {
  label:    string;
  color:    string;
  values:   Record<KpiKey, number>;
};

/* ── KPI Categories ──────────────────────────────────────────────────── */

const KPI_CATEGORIES: KpiCategory[] = [
  {
    cat: "Artilharia",
    kpis: [
      { key: "gols",                   label: "Gols",          short: "Gols"   },
      { key: "assistencias_artilharia",label: "Assistências",  short: "Assist" },
      { key: "minutos_jogados",        label: "Min. Jogados",  short: "Min"    },
    ],
  },
  {
    cat: "Ataque",
    kpis: [
      { key: "finalizacoes_certas",    label: "Fin. Certas",         short: "Fin.C"  },
      { key: "finalizacoes",           label: "Finalizações",        short: "Fin"    },
      { key: "assistencias_ataque",    label: "Assist. (Ataque)",    short: "Ast.A"  },
      { key: "chutes_na_area",         label: "Chutes na Área",      short: "Ch.Int" },
      { key: "chutes_fora_area",       label: "Chutes Fora Área",    short: "Ch.Ext" },
      { key: "cabeceos_a_gol",         label: "Cabeceios a Gol",     short: "Cab"    },
      { key: "ge",                     label: "Gdes Esperanças (GE)","short": "GE"   },
      { key: "eficiencia_ge",          label: "Eficiência GE",       short: "Ef.GE"  },
      { key: "escanteios",             label: "Escanteios",          short: "Esc"    },
    ],
  },
  {
    cat: "Defesa",
    kpis: [
      { key: "perdas_bola_forcadas",       label: "Perdas de Bola",        short: "P.Bola" },
      { key: "pressoes_defensivas",        label: "Pressões Defensivas",   short: "Press"  },
      { key: "pressoes_defensivas_diretas",label: "Pressões Diretas",      short: "P.Dir"  },
      { key: "gols_contra",                label: "Gols Contra",           short: "G.C"    },
    ],
  },
  {
    cat: "Disciplina",
    kpis: [
      { key: "faltas_cometidas",            label: "Faltas Cometidas",  short: "F.Com"   },
      { key: "faltas_sofridas",             label: "Faltas Sofridas",   short: "F.Sof"   },
      { key: "cartoes_amarelos",            label: "Cartões Amarelos",  short: "C.Amar"  },
      { key: "cartoes_vermelhos",           label: "Cartões Vermelhos", short: "C.Verm"  },
      { key: "cartoes_vermelhos_indiretos", label: "V. Vermelhos Ind.", short: "C.V.Ind" },
      { key: "impedimentos",                label: "Impedimentos",      short: "Imped"   },
    ],
  },
  {
    cat: "Distribuição",
    kpis: [
      { key: "passes",                     label: "Passes",               short: "Passes" },
      { key: "precisao_passes_pct",        label: "Precisão Passes (%)",  short: "P.Pass" },
      { key: "cruzamentos",                label: "Cruzamentos",          short: "Cruz"   },
      { key: "tentativas_ruptura_linha",   label: "Ruptura Linha Def.",   short: "Rupt"   },
      { key: "tentativas_mudanca_direcao", label: "Mudança de Direção",   short: "Mud.D"  },
    ],
  },
  {
    cat: "Físico",
    kpis: [
      { key: "corridas_alta_velocidade", label: "Corridas Alta Vel.",    short: "Corr.AV" },
      { key: "arrancadas",               label: "Arrancadas",            short: "Arran"   },
      { key: "velocidade_media",         label: "Veloc. Média (km/h)",   short: "Vel"     },
      { key: "distancia_total",          label: "Distância Total (m)",   short: "Dist"    },
    ],
  },
  {
    cat: "Goleiro",
    kpis: [
      { key: "defesas_goleiro",           label: "Defesas",                short: "Def"   },
      { key: "acoes_goleiro_dentro_area", label: "Ações Dentro Área",     short: "A.Int"  },
      { key: "acoes_goleiro_fora_area",   label: "Ações Fora da Área",    short: "A.Ext"  },
    ],
  },
  {
    cat: "Movimentação",
    kpis: [
      { key: "pedidos_bola",          label: "Pedidos de Bola",          short: "Ped.B"  },
      { key: "pedidos_frente",        label: "Pedidos na Frente",        short: "Ped.F"  },
      { key: "pedidos_entre",         label: "Pedidos Entre Linhas",     short: "Ped.E"  },
      { key: "recepcoes_entre_linhas",label: "Recep. Entre Linhas",      short: "Rec.E"  },
      { key: "recepcoes_sob_pressao", label: "Recep. Sob Pressão",       short: "Rec.P"  },
      { key: "participacoes",         label: "Participações",            short: "Part"   },
    ],
  },
];

const ALL_KPI_DEFS: KpiDef[] = KPI_CATEGORIES.flatMap((c) => c.kpis);

/* Slot-based palette (matches TeamChart) */
const KPI_COLORS = ["#0ea5e9", "#a855f7", "#10b981"] as const;
const KPI_GLOWS  = ["#0ea5e930", "#a855f730", "#10b98130"] as const;
const KPI_BADGES = ["①", "②", "③"] as const;

/* Reference vertex palette */
const REF_MEDIA   = "#94a3b8";
const REF_CLUSTER = "#0ea5e9";
const REF_MAXIMO  = "#fbbf24";
const REF_MINIMO  = "#6366f1";

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
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtNum(v: number): string {
  if (v >= 10000) return `${(v / 1000).toFixed(0)}k`;
  if (v >= 1000)  return `${(v / 1000).toFixed(1)}k`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/* ── TeamMultiSelect ─────────────────────────────────────────────────── */

function TeamMultiSelect({
  countries, selected, onChange,
}: {
  countries: string[];
  selected:  string[];
  onChange:  (v: string[]) => void;
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
    <div ref={ref} style={{ position: "relative" }}>
      <p style={{ fontSize: 9, letterSpacing: "0.09em", textTransform: "uppercase", color: "#4a6890", marginBottom: 6 }}>Seleção</p>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#050d2e", border: "1px solid #1e3a8a55",
          borderRadius: 9, padding: "6px 12px", fontSize: 12,
          color: selected.length > 0 ? "#94a3b8" : "#4a6890",
          minWidth: 190, maxWidth: 280, cursor: "pointer", outline: "none",
        }}
      >
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <svg style={{ width: 12, height: 12, flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}
          fill="none" stroke="#3a5a8a" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", zIndex: 30, marginTop: 4, width: 224,
          background: "#050d2e", border: "1px solid #1e3a8a55",
          borderRadius: 9, boxShadow: "0 8px 32px #000a", overflow: "hidden",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid #1e3a8a30" }}>
            <span style={{ fontSize: 11, color: "#4a6890" }}>
              {selected.length === 0 ? "Todas" : `${selected.length} selecionadas`}
            </span>
            {selected.length > 0 && (
              <button onClick={() => { onChange([]); setOpen(false); }}
                style={{ fontSize: 11, color: "#10b981", background: "none", border: "none", cursor: "pointer" }}>
                Limpar
              </button>
            )}
          </div>
          <div style={{ overflowY: "auto", maxHeight: 208, padding: "4px 0" }}>
            {countries.map((c) => (
              <label key={c}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", cursor: "pointer" }}
                className="hover:bg-[#0a162880]">
                <input type="checkbox" checked={selected.includes(c)} onChange={() => toggle(c)}
                  className="accent-emerald-500 w-3 h-3 shrink-0" />
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{c}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── PlayerMultiSelect ───────────────────────────────────────────────── */

function PlayerMultiSelect({
  players,
  allPlayers,
  selected,
  onChange,
}: {
  players:    JogadorCompleto[];
  allPlayers: JogadorCompleto[];
  selected:   number[];
  onChange:   (v: number[]) => void;
}) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  const nameMap = useMemo(
    () => new Map(allPlayers.map((j) => [j.id, j])),
    [allPlayers],
  );

  const visible = query.trim()
    ? players.filter((j) => j.nome.toLowerCase().includes(query.toLowerCase()))
    : players;

  const label =
    selected.length === 0
      ? "Nenhum fixado"
      : selected.length <= 2
        ? selected.map((id) => lastName(nameMap.get(id)?.nome ?? "?")).join(", ")
        : `${selected.slice(0, 2).map((id) => lastName(nameMap.get(id)?.nome ?? "?")).join(", ")} +${selected.length - 2}`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <p style={{ fontSize: 9, letterSpacing: "0.09em", textTransform: "uppercase", color: "#4a6890", marginBottom: 6 }}>
        Jogadores <span style={{ color: "#10b981", textTransform: "none", letterSpacing: "normal" }}>(fixa no radar)</span>
      </p>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#050d2e", border: "1px solid #1e3a8a55",
          borderRadius: 9, padding: "6px 12px", fontSize: 12,
          color: selected.length > 0 ? "#94a3b8" : "#4a6890",
          minWidth: 220, maxWidth: 340, cursor: "pointer", outline: "none",
        }}
      >
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <svg style={{ width: 12, height: 12, flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}
          fill="none" stroke="#3a5a8a" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", zIndex: 30, marginTop: 4, width: 300,
          background: "#050d2e", border: "1px solid #1e3a8a55",
          borderRadius: 9, boxShadow: "0 8px 32px #000a", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid #1e3a8a30" }}>
            <span style={{ fontSize: 11, color: "#4a6890" }}>
              {players.length} disponíveis{selected.length > 0 && ` · ${selected.length} fixados`}
            </span>
            {selected.length > 0 && (
              <button onClick={() => onChange([])}
                style={{ fontSize: 11, color: "#10b981", background: "none", border: "none", cursor: "pointer" }}>
                Limpar
              </button>
            )}
          </div>
          {/* Search */}
          <div style={{ padding: "6px 8px", borderBottom: "1px solid #1e3a8a25" }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar jogador…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%", background: "#030812",
                border: "1px solid #1e3a8a40", borderRadius: 6,
                padding: "4px 8px", fontSize: 11, color: "#94a3b8", outline: "none",
              }}
              className="placeholder-[#3a5a7a]"
            />
          </div>
          {/* List */}
          <div style={{ overflowY: "auto", maxHeight: 220, padding: "4px 0" }}>
            {visible.length === 0 ? (
              <p style={{ padding: "12px 16px", fontSize: 11, color: "#4a6890" }}>
                {query ? "Nenhum jogador encontrado" : "Nenhum jogador com esses filtros"}
              </p>
            ) : (
              visible.map((j) => (
                <label key={j.id}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", cursor: "pointer" }}
                  className="hover:bg-[#0a162880]">
                  <input type="checkbox" checked={selected.includes(j.id)} onChange={() => toggle(j.id)}
                    className="accent-emerald-500 w-3 h-3 shrink-0" />
                  <span style={{ fontSize: 11, color: "#e2e8f0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {j.nome}
                  </span>
                  <span style={{ fontSize: 10, color: POS_COLOR[j.posicao_campo] ?? "#6b7280", flexShrink: 0 }}>
                    {j.posicao_campo}
                  </span>
                  <span style={{ fontSize: 10, color: "#4a6890", flexShrink: 0 }}>
                    {j.pais}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Radar Chart ─────────────────────────────────────────────────────── */

function RadarChart({
  players, kpis, uMax, refVertices,
}: {
  players:     JogadorCompleto[];
  kpis:        KpiKey[];
  uMax:        Record<KpiKey, number>;
  refVertices: RefVertex[];
}) {
  const N     = players.length;
  const TOTAL = N + refVertices.length;

  if (N === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 224, fontSize: 13, color: "#6b8fc4" }}>
        Nenhum jogador encontrado com os filtros selecionados.
      </div>
    );
  }

  const RINGS = [0.25, 0.5, 0.75, 1.0];

  function ringPts(frac: number) {
    return toPoints(Array.from({ length: TOTAL }, (_, i) => rPoint(i, TOTAL, frac)));
  }

  function allPts(key: KpiKey) {
    const max = uMax[key] || 1;
    const playerPts = players.map((j, i) =>
      rPoint(i, TOTAL, Math.min((Number(j[key]) || 0) / max, 1))
    );
    const refPts = refVertices.map((rv, ri) =>
      rPoint(N + ri, TOTAL, Math.min((rv.values[key] || 0) / max, 1))
    );
    return toPoints([...playerPts, ...refPts]);
  }

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: 540 }}>
      <defs>
        <radialGradient id="pc-bg" cx="42%" cy="38%" r="68%">
          <stop offset="0%"   stopColor="#0d1f44" />
          <stop offset="55%"  stopColor="#060f26" />
          <stop offset="100%" stopColor="#02060f" />
        </radialGradient>
      </defs>
      <rect width={SVG_W} height={SVG_H} fill="url(#pc-bg)" rx="12" />

      {/* Ambient cave light bands */}
      <rect x={CX - R * 1.4} y={CY - R * 1.4} width={R * 2.8} height={R * 0.85}
        fill="#0ea5e9" fillOpacity="0.018" />
      <rect x={CX - R * 1.4} y={CY - R * 0.55} width={R * 2.8} height={R * 0.85}
        fill="#7c3aed" fillOpacity="0.014" />

      {/* Radial axes */}
      {Array.from({ length: TOTAL }, (_, i) => {
        const outer  = rPoint(i, TOTAL, 1);
        const isRef  = i >= N;
        const refCol = isRef ? refVertices[i - N].color : "#1e3a8a";
        return (
          <line key={i} x1={CX} y1={CY}
            x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
            stroke={refCol} strokeWidth="1"
            strokeOpacity={isRef ? 0.3 : 0.3} strokeDasharray={isRef ? "4 4" : undefined} />
        );
      })}

      {/* Ring polygons */}
      {RINGS.map((frac) => (
        <polygon key={frac} points={ringPts(frac)}
          fill="none"
          stroke={frac === 1 ? "#1e3a8a" : "#0d1f44"}
          strokeOpacity={frac === 1 ? 0.5 : 0.6}
          strokeWidth={frac === 1 ? "1.5" : "1"} />
      ))}

      {/* Ring % labels */}
      {RINGS.slice(0, -1).map((frac) => {
        const p = rPoint(0, TOTAL, frac);
        return (
          <text key={frac} x={(p.x - 5).toFixed(1)} y={(p.y + 3).toFixed(1)}
            textAnchor="end" fill="#2d4a7a" fontSize="9">
            {Math.round(frac * 100)}%
          </text>
        );
      })}

      {/* KPI polygons (players + ref vertices together) */}
      {kpis.map((key, ki) => {
        const color = KPI_COLORS[ki];
        const max   = uMax[key] || 1;
        return (
          <g key={String(key)}>
            <polygon points={allPts(key)}
              fill={color} fillOpacity={0.10 + ki * 0.04}
              stroke={color} strokeWidth="2" strokeOpacity="0.9" />

            {/* Dots — players */}
            {players.map((j, i) => {
              const norm = Math.min((Number(j[key]) || 0) / max, 1);
              const p    = rPoint(i, TOTAL, norm);
              return (
                <circle key={j.id} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
                  r="3.5" fill={color} stroke="#0f172a" strokeWidth="1.5" />
              );
            })}

            {/* Dots — ref vertices */}
            {refVertices.map((rv, ri) => {
              const norm = Math.min((rv.values[key] || 0) / max, 1);
              const p    = rPoint(N + ri, TOTAL, norm);
              return (
                <circle key={rv.label + ki} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
                  r="4" fill={rv.color} stroke="#0f172a" strokeWidth="1.5" opacity="0.9" />
              );
            })}
          </g>
        );
      })}

      {/* Player vertex labels */}
      {players.map((j, i) => {
        const a      = rAngle(i, TOTAL);
        const cosA   = Math.cos(a);
        const sinA   = Math.sin(a);
        const lx     = CX + LABEL_R * cosA;
        const ly     = CY + LABEL_R * sinA;
        const anchor = cosA > 0.15 ? "start" : cosA < -0.15 ? "end" : "middle";
        const posCol = POS_COLOR[j.posicao_campo] ?? "#6b7280";
        const vy     = sinA < -0.4 ? -14 : sinA > 0.4 ? 6 : -5;
        const dot    = rPoint(i, TOTAL, 1);
        return (
          <g key={j.id}>
            <circle cx={dot.x.toFixed(1)} cy={dot.y.toFixed(1)} r="3" fill="#2d4a7a" />
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

      {/* Reference vertex labels */}
      {refVertices.map((rv, ri) => {
        const i      = N + ri;
        const a      = rAngle(i, TOTAL);
        const cosA   = Math.cos(a);
        const sinA   = Math.sin(a);
        const lx     = CX + LABEL_R * cosA;
        const ly     = CY + LABEL_R * sinA;
        const anchor = cosA > 0.15 ? "start" : cosA < -0.15 ? "end" : "middle";
        const vy     = sinA < -0.4 ? -14 : sinA > 0.4 ? 6 : -5;
        const dot    = rPoint(i, TOTAL, 1);
        const val    = rv.values[kpis[0]];
        return (
          <g key={rv.label}>
            <circle cx={dot.x.toFixed(1)} cy={dot.y.toFixed(1)} r="4"
              fill={rv.color} fillOpacity="0.25"
              stroke={rv.color} strokeWidth="1.5" strokeOpacity="0.7" />
            <text x={lx.toFixed(1)} y={(ly + vy).toFixed(1)}
              textAnchor={anchor} fill={rv.color} fontSize="11" fontWeight="700">
              {rv.label}
            </text>
            <text x={lx.toFixed(1)} y={(ly + vy + 13).toFixed(1)}
              textAnchor={anchor} fill={rv.color} fontSize="9" opacity="0.75">
              {fmtNum(val)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Stats Table ─────────────────────────────────────────────────────── */

function StatsTable({
  players, kpis, refVertices,
}: {
  players:     JogadorCompleto[];
  kpis:        KpiKey[];
  refVertices: RefVertex[];
}) {
  if (players.length === 0) return null;
  return (
    <div style={{ overflow: "auto", borderRadius: 12, border: "1px solid #1e3a8a28", height: "100%" }}>
      <table className="w-full text-xs text-left">
        <thead>
          <tr style={{ background: "#060f26", color: "#4a6890", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>
            <th className="px-3 py-2 w-7">#</th>
            <th className="px-3 py-2">Jogador</th>
            <th className="px-3 py-2">País</th>
            <th className="px-3 py-2 w-12">Pos</th>
            {kpis.map((k, ki) => (
              <th key={String(k)} className="px-3 py-2 text-right whitespace-nowrap"
                style={{ color: KPI_COLORS[ki] }}>
                {ALL_KPI_DEFS.find((d) => d.key === k)?.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Player rows */}
          {players.map((j, idx) => (
            <tr key={j.id} style={{ borderBottom: "1px solid #0a162880" }} className="hover:bg-[#060f2660] transition-colors">
              <td className="px-3 py-2" style={{ color: "#2d4a7a" }}>{idx + 1}</td>
              <td className="px-3 py-2 font-medium text-white">{j.nome}</td>
              <td className="px-3 py-2" style={{ color: "#94a3b8" }}>{j.pais}</td>
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

          {/* Separator */}
          <tr>
            <td colSpan={4 + kpis.length} style={{
              padding: "3px 12px",
              background: "#030812",
              borderTop: "1px solid #1e3a8a30",
              borderBottom: "1px solid #1e3a8a30",
            }}>
              <span style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2d4a7a" }}>
                Referência · base completa
              </span>
            </td>
          </tr>

          {/* Reference rows */}
          {refVertices.map((rv) => (
            <tr key={rv.label} style={{ borderBottom: "1px solid #0a162860" }}>
              <td className="px-3 py-2">
                <span style={{ fontSize: 9, color: rv.color }}>◆</span>
              </td>
              <td className="px-3 py-2 font-semibold" style={{ color: rv.color }} colSpan={2}>
                {rv.label}
              </td>
              <td className="px-3 py-2">
                <span style={{ fontSize: 9, color: "#2d4a7a" }}>—</span>
              </td>
              {kpis.map((k, ki) => (
                <td key={String(k)} className="px-3 py-2 text-right font-mono"
                  style={{ color: rv.color, opacity: 0.85 }}>
                  {fmtNum(rv.values[k])}
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

export default function PlayerChart({
  jogadores,
  lastUpdated,
}: {
  jogadores:   JogadorCompleto[];
  lastUpdated: string | null;
}) {
  const [kpis,      setKpis]      = useState<KpiKey[]>(["gols"]);
  const [position,  setPosition]  = useState<string>("all");
  const [teams,     setTeams]     = useState<string[]>([]);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);

  /* ── Universe stats (full base) ─────────────────────────────────── */

  const uMax = useMemo(() => {
    const r = {} as Record<KpiKey, number>;
    for (const { key } of ALL_KPI_DEFS)
      r[key] = Math.max(...jogadores.map((j) => Number(j[key]) || 0), 1);
    return r;
  }, [jogadores]);

  /* ── Filtered + pinned players ──────────────────────────────────── */

  const countries = useMemo(
    () => [...new Set(jogadores.map((j) => j.pais))].sort(),
    [jogadores],
  );

  const primaryKpi = kpis[0];

  const pinned = useMemo(() => {
    if (pinnedIds.length === 0) return [];
    const idSet = new Set(pinnedIds);
    return jogadores.filter((j) => idSet.has(j.id));
  }, [jogadores, pinnedIds]);

  const filtered = useMemo(() => {
    return jogadores.filter(
      (j) =>
        (position === "all" || j.posicao_campo === position) &&
        (teams.length === 0 || teams.includes(j.pais)),
    );
  }, [jogadores, position, teams]);

  const chartPlayers = useMemo(() => {
    const pinnedIds = new Set(pinned.map((j) => j.id));
    const slots     = Math.max(0, 10 - Math.min(pinned.length, 10));
    const topRest   = filtered
      .filter((j) => !pinnedIds.has(j.id))
      .sort((a, b) => (Number(b[primaryKpi]) || 0) - (Number(a[primaryKpi]) || 0))
      .slice(0, slots);
    return [...pinned, ...topRest]
      .slice(0, 10)
      .sort((a, b) => (Number(b[primaryKpi]) || 0) - (Number(a[primaryKpi]) || 0));
  }, [pinned, filtered, primaryKpi]);

  /* ── Reference vertices ────────────────────────────────────────── */

  const refVertices = useMemo<RefVertex[]>(() => {
    const keyList = ALL_KPI_DEFS.map((d) => d.key);

    function aggFrom(
      source: JogadorCompleto[],
      fn: (vals: number[]) => number,
    ): Record<KpiKey, number> {
      return Object.fromEntries(
        keyList.map((key) => {
          const vals = source.map((j) => Number(j[key]) || 0);
          return [key, fn(vals)];
        })
      ) as Record<KpiKey, number>;
    }

    const avg  = (vals: number[]) =>
      vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

    return [
      {
        label:  "Média Geral",
        color:  REF_MEDIA,
        values: aggFrom(jogadores, avg),
      },
      {
        label:  "Média do Cluster",
        color:  REF_CLUSTER,
        values: aggFrom(chartPlayers.length > 0 ? chartPlayers : jogadores, avg),
      },
      {
        label:  "Máximo",
        color:  REF_MAXIMO,
        values: aggFrom(jogadores, (vals) => Math.max(...vals, 0)),
      },
      {
        label:  "Mínimo",
        color:  REF_MINIMO,
        values: aggFrom(jogadores, (vals) => Math.min(...vals.filter((v) => v > 0), 0)),
      },
    ];
  }, [jogadores, chartPlayers]);

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

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(145deg,#050d2e99 0%,#0a162888 60%,#050d2e99 100%)",
        border: "1px solid #1e3a8a38",
        backdropFilter: "blur(16px)",
        borderRadius: 16,
        padding: "18px 20px",
      }} className="space-y-3">

        {/* KPI slot legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", marginBottom: 8 }}>
          {KPI_COLORS.map((color, i) => {
            const assigned = kpis[i];
            const def = assigned ? ALL_KPI_DEFS.find((d) => d.key === assigned) : null;
            const glow = KPI_GLOWS[i];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 5,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 900,
                  background: assigned ? glow : "#0a162855",
                  border: `1px solid ${assigned ? color + "55" : "#1e3a8a28"}`,
                  color: assigned ? color : "#3a5a8a",
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 11, color: assigned ? color : "#7090b8" }}>
                  KPI {i + 1}
                </span>
                {def && (
                  <span style={{ fontSize: 10, color: "#4a6890" }}>· {def.short}</span>
                )}
                {!def && i >= 1 && (
                  <span style={{ fontSize: 10, color: "#3a5a7a" }}>· opcional</span>
                )}
              </div>
            );
          })}
          <span style={{ marginLeft: "auto", alignSelf: "center", fontSize: 10, color: "#4a6890" }}>
            {kpis.length}/3 KPIs · ordenação pelo 1º
          </span>
        </div>

        {/* KPI pills grouped by category */}
        <div className="space-y-2">
          {KPI_CATEGORIES.map(({ cat, kpis: catKpis }) => (
            <div key={cat} className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
              <span style={{ fontSize: 9, letterSpacing: "0.09em", textTransform: "uppercase", color: "#4a6890", width: 68, flexShrink: 0 }}>
                {cat}
              </span>
              {catKpis.map(({ key, label }) => {
                const idx        = kpis.indexOf(key);
                const isSelected = idx !== -1;
                const isDisabled = !isSelected && kpis.length >= 3;
                const color      = isSelected ? KPI_COLORS[idx] : undefined;
                const glow       = isSelected ? KPI_GLOWS[idx] : undefined;
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
                      background: isSelected ? glow : isDisabled ? "#0a162840" : "#0a162865",
                      border: `1px solid ${
                        isSelected ? color! + "55" : isDisabled ? "#1e3a8a20" : "#1e3a8a35"
                      }`,
                      color: isSelected ? color : isDisabled ? "#2a3a55" : "#94a3b8",
                    }}
                  >
                    {isSelected && (
                      <span style={{ marginRight: 4, fontSize: 9, opacity: 0.85 }}>
                        {KPI_BADGES[idx]}
                      </span>
                    )}
                    {label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Filters row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", paddingTop: 12, borderTop: "1px solid #1e3a8a22" }}>

          {/* Position */}
          <div>
            <p style={{ fontSize: 9, letterSpacing: "0.09em", textTransform: "uppercase", color: "#4a6890", marginBottom: 6 }}>Posição</p>
            <div className="flex gap-1">
              {(["all", "FW", "MF", "DF", "GK"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                    background: position === p
                      ? (p === "all" ? "#374151" : POS_COLOR[p])
                      : "#0a162865",
                    border: `1px solid ${position === p
                      ? (p === "all" ? "#37415155" : POS_COLOR[p] + "55")
                      : "#1e3a8a35"
                    }`,
                    color: position === p ? "#fff" : "#94a3b8",
                  }}
                >
                  {p === "all" ? "Todas" : p}
                </button>
              ))}
            </div>
          </div>

          {/* Team multi-select */}
          <TeamMultiSelect countries={countries} selected={teams} onChange={setTeams} />

          {/* Player multi-select */}
          <PlayerMultiSelect
            players={filtered}
            allPlayers={jogadores}
            selected={pinnedIds}
            onChange={setPinnedIds}
          />

          {/* Count */}
          <div style={{ fontSize: 12, color: "#4a6890", paddingBottom: 6 }}>
            <span style={{ color: "#7090c0", fontWeight: 600 }}>{chartPlayers.length}</span>/10 no radar
            {pinned.length > 0 && (
              <span style={{ color: "#10b981", marginLeft: 4 }}>
                · {pinned.length} fixo{pinned.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Radar + Tabela lado a lado ──────────────────────────────── */}
      <div className="flex gap-4 items-start">

        {/* Radar (esquerda) */}
        <div style={{
          background: "linear-gradient(160deg,#02060f 0%,#060f26 45%,#030812 100%)",
          border: "1px solid #1e3a8a28",
          borderRadius: 16,
          padding: "16px 16px 12px",
          boxShadow: "0 0 80px #0ea5e906 inset, 0 0 40px #a855f703 inset",
        }} className="flex-1 min-w-0">

          {/* KPI legend */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 20px", marginBottom: 12 }}>
            {kpis.map((k, ki) => (
              <span key={String(k)} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <svg width="20" height="8">
                  <line x1="0" y1="4" x2="20" y2="4"
                    stroke={KPI_COLORS[ki]} strokeWidth="2" strokeOpacity="0.9" />
                </svg>
                <span style={{ color: KPI_COLORS[ki], fontWeight: 600 }}>
                  {KPI_BADGES[ki]}{" "}
                </span>
                <span style={{ color: "#e2e8f0" }}>
                  {ALL_KPI_DEFS.find((d) => d.key === k)?.label}
                </span>
              </span>
            ))}

            {/* Ref vertex legend */}
            {[
              { label: "Média Geral",       color: REF_MEDIA   },
              { label: "Média do Cluster",  color: REF_CLUSTER },
              { label: "Máximo",            color: REF_MAXIMO  },
              { label: "Mínimo",            color: REF_MINIMO  },
            ].map((rv) => (
              <span key={rv.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: rv.color, opacity: 0.8, flexShrink: 0 }} />
                <span style={{ color: rv.color, opacity: 0.85 }}>{rv.label}</span>
              </span>
            ))}

            <span style={{ fontSize: 10, color: "#3a5a7a", marginLeft: "auto" }}>
              % norm. pelo máx total
            </span>
          </div>

          <RadarChart
            players={chartPlayers}
            kpis={kpis}
            uMax={uMax}
            refVertices={refVertices}
          />
        </div>

        {/* Tabela (direita) */}
        <div className="w-[420px] shrink-0 self-stretch">
          <StatsTable players={chartPlayers} kpis={kpis} refVertices={refVertices} />
        </div>
      </div>

      {/* ── Position legend ───────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 20, fontSize: 12, flexWrap: "wrap" }}>
        {Object.entries(POS_COLOR).map(([p, c]) => (
          <span key={p} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, flexShrink: 0, backgroundColor: c }} />
            <span style={{ color: "#4a6890" }}>{p} · {POS_LABEL[p]}</span>
          </span>
        ))}
        {/* Ref vertex mini-legend */}
        {[
          { label: "Média Geral",      color: REF_MEDIA   },
          { label: "Média do Cluster", color: REF_CLUSTER },
          { label: "Máximo",           color: REF_MAXIMO  },
          { label: "Mínimo",           color: REF_MINIMO  },
        ].map((rv) => (
          <span key={rv.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", flexShrink: 0, backgroundColor: rv.color, opacity: 0.7 }} />
            <span style={{ color: "#4a6890" }}>{rv.label}</span>
          </span>
        ))}
      </div>

      {/* ── Rodapé ───────────────────────────────────────────────────── */}
      <p style={{ fontSize: 10, color: "#4a6890", marginTop: 4 }}>
        Fonte: fifa.com{lastUpdated && <> · Extração: {fmtDate(lastUpdated)}</>}
      </p>
    </div>
  );
}
