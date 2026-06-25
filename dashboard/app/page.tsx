import { Suspense } from "react";
import UpdateButton from "@/components/UpdateButton";
import PlayerPanel from "@/components/PlayerPanel";
import TeamPanel from "@/components/TeamPanel";

// Tabs são controladas via searchParam (server-side, sem JS extra)
type Props = { searchParams: Promise<{ tab?: string }> };

const TABS = [
  { id: "jogadores", label: "Jogadores" },
  { id: "times",     label: "Times" },
];

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-10 bg-gray-800 rounded-lg" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-8 bg-gray-800/60 rounded" />
      ))}
    </div>
  );
}

export default async function Home({ searchParams }: Props) {
  const { tab = "jogadores" } = await searchParams;
  const activeTab = TABS.find((t) => t.id === tab)?.id ?? "jogadores";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Copa do Mundo 2026
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Painel de Disciplina · Dados oficiais FIFA
          </p>
        </div>
        <UpdateButton />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`?tab=${t.id}`}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === t.id
                ? "bg-gray-800 text-white border-b-2 border-emerald-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* ── Painéis ────────────────────────────────────────────────── */}
      <Suspense fallback={<LoadingSkeleton />}>
        {activeTab === "jogadores" && <PlayerPanel />}
        {activeTab === "times"     && <TeamPanel />}
      </Suspense>

      {/* ── Rodapé ─────────────────────────────────────────────────── */}
      <footer className="mt-12 text-center text-xs text-gray-600">
        Fonte: fifa.com · Projeto de portfólio · Dados atualizados via scraper Python
      </footer>
    </div>
  );
}
