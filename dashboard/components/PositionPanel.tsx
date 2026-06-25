import { getPosicaoStats, type PosicaoStat } from "@/lib/supabase";
import { calcStats } from "@/lib/stats";
import StatSummary from "./StatSummary";

const POS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  DF: { label: "Defensores",  color: "text-emerald-400", bg: "border-emerald-500/40 bg-emerald-500/10" },
  MF: { label: "Meias",       color: "text-blue-400",    bg: "border-blue-500/40 bg-blue-500/10" },
  FW: { label: "Atacantes",   color: "text-orange-400",  bg: "border-orange-500/40 bg-orange-500/10" },
  GK: { label: "Goleiros",    color: "text-purple-400",  bg: "border-purple-500/40 bg-purple-500/10" },
};

const METRICS = [
  { key: "total_faltas_cometidas" as keyof PosicaoStat, label: "Faltas Cometidas" },
  { key: "total_faltas_sofridas"  as keyof PosicaoStat, label: "Faltas Sofridas" },
  { key: "total_cartoes_amarelos" as keyof PosicaoStat, label: "Cartões Amarelos" },
  { key: "total_cartoes_vermelhos"as keyof PosicaoStat, label: "Cartões Vermelhos" },
  { key: "total_impedimentos"     as keyof PosicaoStat, label: "Impedimentos" },
];

export default async function PositionPanel() {
  const posicoes = await getPosicaoStats();
  const ORDER    = ["DF", "MF", "FW", "GK"];
  const sorted   = ORDER.map((p) => posicoes.find((r) => r.posicao_campo === p)).filter(Boolean) as PosicaoStat[];

  return (
    <div className="space-y-6">
      {METRICS.map((metric) => {
        const values = sorted.map((p) => Number(p[metric.key]) || 0);
        const stats  = calcStats(values);
        const maxVal = stats.max;

        return (
          <div key={String(metric.key)}>
            <StatSummary stats={stats} label={metric.label} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sorted.map((pos) => {
                const val  = Number(pos[metric.key]) || 0;
                const bar  = maxVal === 0 ? 0 : Math.round((val / maxVal) * 100);
                const meta = POS_LABELS[pos.posicao_campo] ?? { label: pos.posicao_campo, color: "text-white", bg: "border-gray-700" };
                return (
                  <div key={pos.posicao_campo} className={`rounded-xl border p-4 ${meta.bg}`}>
                    <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${meta.color}`}>
                      {pos.posicao_campo}
                    </div>
                    <div className="text-gray-400 text-xs mb-3">{meta.label}</div>
                    <div className="text-3xl font-bold text-white mb-2">{val}</div>
                    <div className="text-xs text-gray-500 mb-2">
                      {pos.total_jogadores} jogadores
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${meta.color.replace("text-", "bg-")}`}
                        style={{ width: `${bar}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
