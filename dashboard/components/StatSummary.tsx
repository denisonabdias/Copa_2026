import type { Stats } from "@/lib/stats";

type Props = {
  stats: Stats;
  label: string;
  unit?: string;
};

export default function StatSummary({ stats, label, unit = "" }: Props) {
  const fmt = (n: number) => (Number.isInteger(n) ? n : n.toFixed(2));
  return (
    <div className="flex gap-6 px-4 py-3 bg-gray-800 rounded-lg text-sm mb-4 flex-wrap">
      <span className="text-gray-400 font-medium">{label}</span>
      <span className="text-white">
        <span className="text-gray-400 mr-1">Máx</span>
        <strong>{fmt(stats.max)}{unit}</strong>
      </span>
      <span className="text-white">
        <span className="text-gray-400 mr-1">Média</span>
        <strong>{fmt(stats.avg)}{unit}</strong>
      </span>
      <span className="text-white">
        <span className="text-gray-400 mr-1">Mediana</span>
        <strong>{fmt(stats.median)}{unit}</strong>
      </span>
    </div>
  );
}
