import { getJogadores, type Jogador } from "@/lib/supabase";
import { calcStats, pct } from "@/lib/stats";
import StatSummary from "./StatSummary";

const METRICS: { key: keyof Jogador; label: string }[] = [
  { key: "faltas_cometidas",            label: "Faltas Cometidas" },
  { key: "faltas_sofridas",             label: "Faltas Sofridas" },
  { key: "cartoes_amarelos",            label: "Cartões Amarelos" },
  { key: "cartoes_vermelhos",           label: "Cartões Vermelhos" },
  { key: "impedimentos",                label: "Impedimentos" },
];

const POS_COLOR: Record<string, string> = {
  FW: "bg-orange-500",
  MF: "bg-blue-500",
  DF: "bg-emerald-500",
  GK: "bg-purple-500",
};

export default async function PlayerPanel({ metric = "faltas_cometidas" }: { metric?: string }) {
  const jogadores = await getJogadores();
  const metricKey = (METRICS.find((m) => m.key === metric) ? metric : "faltas_cometidas") as keyof Jogador;
  const metricLabel = METRICS.find((m) => m.key === metricKey)?.label ?? metricKey;

  const values = jogadores.map((j) => Number(j[metricKey]) || 0);
  const stats  = calcStats(values);
  const top50  = jogadores.slice(0, 50); // exibe top 50 por ranking

  return (
    <div>
      <StatSummary stats={stats} label={metricLabel} />

      {/* Legenda de posições */}
      <div className="flex gap-4 mb-4 text-xs flex-wrap">
        {Object.entries(POS_COLOR).map(([pos, color]) => (
          <span key={pos} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded-sm inline-block ${color}`} />
            <span className="text-gray-400">{pos}</span>
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">Jogador</th>
              <th className="px-3 py-2 w-12">País</th>
              <th className="px-3 py-2 w-12">Pos</th>
              <th className="px-3 py-2 w-48">{metricLabel}</th>
              <th className="px-3 py-2 w-8 text-right">Val</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {top50.map((j) => {
              const val = Number(j[metricKey]) || 0;
              const bar = pct(val, stats.max);
              const posColor = POS_COLOR[j.posicao_campo] ?? "bg-gray-500";
              return (
                <tr key={j.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-3 py-2 text-gray-500">{j.ranking}</td>
                  <td className="px-3 py-2 font-medium text-white">{j.nome}</td>
                  <td className="px-3 py-2 text-gray-300">{j.pais}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs text-white ${posColor}`}>
                      {j.posicao_campo}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${bar}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-white">{val}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Exibindo top 50 de {jogadores.length} jogadores • ordenado por ranking FIFA
      </p>
    </div>
  );
}
