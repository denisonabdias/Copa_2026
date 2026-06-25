import { getTimeStats, type TimeStat } from "@/lib/supabase";
import { calcStats, pct } from "@/lib/stats";
import StatSummary from "./StatSummary";

const METRICS: { key: keyof TimeStat; label: string }[] = [
  { key: "total_faltas_cometidas", label: "Faltas Cometidas (total)" },
  { key: "total_faltas_sofridas",  label: "Faltas Sofridas (total)" },
  { key: "total_cartoes_amarelos", label: "Cartões Amarelos (total)" },
  { key: "total_cartoes_vermelhos",label: "Cartões Vermelhos (total)" },
  { key: "total_impedimentos",     label: "Impedimentos (total)" },
];

export default async function TeamPanel({ metric = "total_faltas_cometidas" }: { metric?: string }) {
  const times = await getTimeStats();
  const metricKey = (METRICS.find((m) => m.key === metric) ? metric : "total_faltas_cometidas") as keyof TimeStat;
  const metricLabel = METRICS.find((m) => m.key === metricKey)?.label ?? String(metricKey);

  const sorted = [...times].sort((a, b) => Number(b[metricKey]) - Number(a[metricKey]));
  const values = sorted.map((t) => Number(t[metricKey]) || 0);
  const stats  = calcStats(values);

  return (
    <div>
      <StatSummary stats={stats} label={metricLabel} />

      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">Seleção</th>
              <th className="px-3 py-2 w-16 text-center">Jog.</th>
              <th className="px-3 py-2">{metricLabel}</th>
              <th className="px-3 py-2 w-8 text-right">Val</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((t, i) => {
              const val = Number(t[metricKey]) || 0;
              const bar = pct(val, stats.max);
              const isAboveAvg = val > stats.avg;
              return (
                <tr key={t.pais} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold text-white">{t.pais}</td>
                  <td className="px-3 py-2 text-center text-gray-400">{t.total_jogadores}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${isAboveAvg ? "bg-orange-400" : "bg-emerald-500"}`}
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
        {times.length} seleções • <span className="text-orange-400">■</span> acima da média
      </p>
    </div>
  );
}
