"use client";

import { useState } from "react";
import PlayerChart from "./PlayerChart";
import TeamChart from "./TeamChart";
import DuelChart from "./DuelChart";
import type { JogadorCompleto, TimeStatCompleto } from "@/lib/supabase";

const TABS = [
  { id: "jogadores", label: "Jogadores" },
  { id: "times",     label: "Times"     },
  { id: "duelo",     label: "Duelo"     },
];

export default function TabContainer({
  jogadores,
  times,
  lastUpdated,
}: {
  jogadores:   JogadorCompleto[];
  times:       TimeStatCompleto[];
  lastUpdated: string | null;
}) {
  const [activeTab, setActiveTab] = useState("jogadores");

  return (
    <>
      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === t.id
                ? "bg-gray-800 text-white border-b-2 border-emerald-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/*
        Todos os painéis ficam montados no DOM o tempo todo.
        Apenas a visibilidade muda — o estado interno de cada componente
        (KPIs selecionados, seleções de times) é preservado ao trocar de aba.
      */}
      <div hidden={activeTab !== "jogadores"}>
        <PlayerChart jogadores={jogadores} lastUpdated={lastUpdated} />
      </div>
      <div hidden={activeTab !== "times"}>
        <TeamChart times={times} lastUpdated={lastUpdated} />
      </div>
      <div hidden={activeTab !== "duelo"}>
        <DuelChart times={times} lastUpdated={lastUpdated} />
      </div>
    </>
  );
}
