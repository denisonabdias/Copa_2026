"use client";

import { useState } from "react";

export default function UpdateButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function handleClick() {
    setStatus("loading");
    try {
      const res = await fetch("/api/trigger-scraper", { method: "POST" });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
    // Volta ao idle após 8 segundos
    setTimeout(() => setStatus("idle"), 8000);
  }

  const labels = {
    idle:    "⟳ Atualizar Dados",
    loading: "Disparando workflow...",
    ok:      "✓ Workflow iniciado! (~5 min)",
    error:   "✗ Erro ao disparar — tente novamente",
  };

  const colors = {
    idle:    "bg-emerald-600 hover:bg-emerald-500 text-white",
    loading: "bg-gray-500 text-white cursor-wait",
    ok:      "bg-blue-600 text-white",
    error:   "bg-red-600 text-white",
  };

  return (
    <button
      onClick={handleClick}
      disabled={status !== "idle"}
      className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${colors[status]}`}
    >
      {labels[status]}
    </button>
  );
}
