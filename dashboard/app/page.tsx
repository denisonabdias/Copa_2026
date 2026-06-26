import { Suspense } from "react";
import {
  getJogadoresCompletos,
  getTimeStatsCompletos,
  getLastUpdate,
} from "@/lib/supabase";
import UpdateButton from "@/components/UpdateButton";
import TabContainer from "@/components/TabContainer";

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

/* Componente assíncrono separado para preservar o Suspense boundary */
async function Paineis() {
  const [jogadores, times, lastUpdated] = await Promise.all([
    getJogadoresCompletos(),
    getTimeStatsCompletos(),
    getLastUpdate(),
  ]);
  return (
    <TabContainer
      jogadores={jogadores}
      times={times}
      lastUpdated={lastUpdated}
    />
  );
}

export default function Home() {
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

      {/* ── Painéis ────────────────────────────────────────────────── */}
      <Suspense fallback={<LoadingSkeleton />}>
        <Paineis />
      </Suspense>

      {/* ── Rodapé ─────────────────────────────────────────────────── */}
      <footer className="mt-12 text-center text-xs text-gray-600">
        Fonte: fifa.com · Projeto de portfólio · Dados atualizados via scraper Python
      </footer>
    </div>
  );
}
