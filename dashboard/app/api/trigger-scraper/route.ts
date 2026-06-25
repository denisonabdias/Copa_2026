import { NextResponse } from "next/server";

const REPO  = "denisonabdias/Copa_2026";
const WF    = "etl_disciplina.yml";
const BRANCH = "main";

export async function POST() {
  const pat = process.env.GITHUB_PAT;
  if (!pat) {
    return NextResponse.json({ error: "GITHUB_PAT não configurado" }, { status: 500 });
  }

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WF}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: BRANCH,
        inputs: { triggered_by: "vercel-app" },
      }),
    }
  );

  // GitHub retorna 204 No Content em caso de sucesso
  if (res.status === 204) {
    return NextResponse.json({ ok: true });
  }

  const body = await res.text();
  return NextResponse.json(
    { error: `GitHub API retornou ${res.status}`, detail: body },
    { status: res.status }
  );
}
