# Status Atual — Copa 2026 Dashboard

_Atualizado: 2026-06-28 (sessão 2)_

---

## O que foi consolidado (sessão 2026-06-28 sessão 2)

### `2a346a3` — Multi-select jogadores/seleções + rodapé atualizado

**PlayerChart.tsx** — filtro de jogador reformulado:

- Busca por texto (`input`) substituída por **`PlayerMultiSelect`** (dropdown com checkboxes)
- A lista do dropdown é **pré-filtrada** pelos botões de Posição e pelo filtro de Seleção ativos
- Jogadores selecionados ficam fixados no radar (lógica `pinnedIds: number[]` em vez de `nameSearch: string`)
- Header do dropdown exibe contagem de disponíveis e fixados; botão "Limpar" quando há seleção
- Cada item mostra: nome completo · badge de posição colorido · país

**TeamChart.tsx** — seletor de destaque reformulado:

- `<select>` único substituído por **`TeamHighlightMultiSelect`** (dropdown com checkboxes)
- Botão **"Marcar todas"** / **"Desmarcar todas"** no header (toggle inteligente)
- Botão "Limpar" aparece quando há seleção parcial
- `highlights: string[]` em vez de `search: string`; `BubbleChart` atualizado (`highlights.includes(t.pais)`)
- Contador "N destacadas" no rodapé do filtro

**DuelChart.tsx + TeamChart.tsx + PlayerChart.tsx** — rodapé:
- Texto alterado para: `Copa do Mundo 2026 · Analytics Performance · GitHub: denisonabdias/Copa_2026` (link clicável)

---

## O que foi consolidado (sessão 2026-06-28)

### `af6672b` — Barras e linhas do Duelo mais estreitas

**DuelChart.tsx** — apenas constantes de layout:

| Constante | Antes | Depois |
|-----------|-------|--------|
| `ROW_H` (altura linha KPI) | 22 px | 16 px |
| `CAT_H` (altura separador categoria) | 28 px | 20 px |
| `barH` (espessura das barras) | 10 px | 6 px |
| `r` do winner-dot | 2.5 | 2 |

Altura total do SVG caiu de ~1 166 px para ~862 px (−26 %). Sem alteração de dados ou estrutura.

---

### `2ec92be` — Vértice "Média do Cluster" no radar e na tabela

**PlayerChart.tsx** — quarto vértice de referência adicionado:

- Label: **Média do Cluster** · cor: `#0ea5e9` (azul do KPI slot 1)
- Valor: média de **cada KPI entre os jogadores visíveis no gráfico no momento**
- Atualiza dinamicamente ao mudar filtros (posição, seleção, busca por nome)
- Inserido após "Média Geral" na ordem do array `refVertices`
- `refVertices` useMemo movido para após `chartPlayers` (dependência correta)
- Aparece no radar, na tabela (linha colorida na seção Referência) e nas duas legendas

---

### `29b44ef` — Design cave/neon no radar + vértices Média Geral, Máximo e Mínimo

**PlayerChart.tsx** — reescrita completa:

**Design (do TeamChart aplicado ao Painel Jogadores):**
- `KPI_COLORS` → `["#0ea5e9", "#a855f7", "#10b981"]` (slots azul/roxo/verde do TeamChart)
- Pills com fundo glow semi-transparente (`KPI_GLOWS`) + borda colorida + badge `①②③`
- Slot legend acima dos pills: badge numerado com glow ativo quando KPI atribuído
- Painel radar com `boxShadow: "0 0 80px #0ea5e906 inset, 0 0 40px #a855f703 inset"`
- Gradiente radial do SVG: `cx="42%" cy="38%"` (off-center, igual ao TeamChart)
- Eixos dos vértices de referência: `strokeDasharray="4 4"` + cor própria
- Faixas de luz ambiente cave nas duas bandas horizontais do SVG

**3 vértices de referência (base completa — `jogadores`):**

| Vértice | Cor | Cálculo |
|---------|-----|---------|
| Média Geral | `#94a3b8` (slate) | AVG de cada KPI entre todos os jogadores |
| Máximo | `#fbbf24` (âmbar) | MAX de cada KPI na base completa |
| Mínimo | `#6366f1` (índigo) | MIN de cada KPI na base completa (excluindo zeros) |

- Label do vértice no SVG exibe o valor bruto do 1º KPI selecionado
- Tabela: separador "Referência · base completa" + 1 linha por vértice com valores de todos os KPIs selecionados

---

### Deploy / URL

- Alias permanente: **https://dashboard-copa-2026.vercel.app**
- Deploy feito via `npx vercel --prod --scope modeleiros --yes` (projeto `dashboard`)
- O projeto `copa-2026` no Vercel está vinculado ao GitHub mas erra (tenta buildar a raiz); ignorar — não interfere no app
- Para futuros deploys: rodar o comando acima dentro da pasta `dashboard/`

---

## Arquitetura atual consolidada

```
page.tsx (Server Component)
  └── <Suspense><Paineis /></Suspense>
        Paineis() — async, Promise.all([jogadores, times, lastUpdated])
          └── <TabContainer jogadores times lastUpdated />
                TabContainer.tsx — "use client", useState(activeTab)
                  ├── <div hidden={≠ "jogadores"}><PlayerChart .../></div>
                  ├── <div hidden={≠ "times"}><TeamChart .../></div>
                  └── <div hidden={≠ "duelo"}><DuelChart .../></div>
```

---

## Estrutura de vértices do radar (PlayerChart)

```
Vértices 0..N-1  →  chartPlayers (top-10 por KPI primário, com fixação por busca)
Vértice N+0      →  Média Geral      (#94a3b8) — base completa
Vértice N+1      →  Média do Cluster (#0ea5e9) — jogadores visíveis
Vértice N+2      →  Máximo           (#fbbf24) — base completa
Vértice N+3      →  Mínimo           (#6366f1) — base completa
```

Eixos dos 4 vértices de referência: tracejados (`strokeDasharray="4 4"`).

---

## Regras de negócio validadas

| Regra | Onde | Status |
|-------|------|--------|
| UPSERT por `UNIQUE(nome, pais)` — nunca `id` | `fifa_scraper.py` → `_UPSERT_CONFIGS` | ✅ |
| `SUM` para contagens, `AVG` para percentuais/físico | View `stats_completos_por_time` | ✅ |
| Normalização = `valor / máx do universo total` (não do subset filtrado) | `PlayerChart.tsx` → `uMax` | ✅ |
| `media_` keys: normalização começa no `min*0.95` | `TeamChart.tsx` → `uMin` | ✅ |
| Campos `NUMERIC` chegam como `string` via SDK → converter com `Number()` | `lib/supabase.ts` | ✅ |
| Máx 3 KPIs no radar | `PlayerChart.tsx` → `kpis.length < 3` | ✅ |
| Máx 4 KPIs no bubble chart (X / Y / Tamanho / Temperatura) | `TeamChart.tsx` → `kpis.length < 4` | ✅ |
| Máx 10 jogadores no radar | `PlayerChart.tsx` → `chartPlayers.slice(0,10)` | ✅ |
| `refVertices` declarado após `chartPlayers` (Média do Cluster depende de chartPlayers) | `PlayerChart.tsx` | ✅ |
| Gradiente Duelo com `gradientUnits="userSpaceOnUse"` e coordenadas fixas | `DuelChart.tsx` | ✅ |
| Env vars Vercel: `bash + printf` — nunca PowerShell pipe (injeta BOM) | `CLAUDE.md` | ✅ |
| Trigger de atualização: apenas `workflow_dispatch` — sem cron | `.github/workflows/etl_disciplina.yml` | ✅ |
| Deploy via `vercel --prod` na pasta `dashboard/` — não pelo push ao GitHub | CLI / `CLAUDE.md` | ✅ |

---

## Paleta de design consolidada

| Elemento | Valor |
|----------|-------|
| Fundo cave profundo | `#02060f`, `#060f26`, `#030812` |
| Fundo painel filtros | `linear-gradient(145deg, #050d2e99, #0a162888)` |
| Border padrão | `#1e3a8a28` a `#1e3a8a55` |
| Texto branco KPI | `#e2e8f0` |
| Texto labels visíveis | `#94a3b8` |
| Texto auxiliar | `#4a6890` |
| Texto dim/desabilitado | `#2a3a55` a `#3a5a7a` |
| KPI slot 1 — azul | `#0ea5e9` / glow `#0ea5e930` |
| KPI slot 2 — roxo | `#a855f7` / glow `#a855f730` |
| KPI slot 3 — verde | `#10b981` / glow `#10b98130` |
| Temperatura fria→quente | `#001eff → #00e5ff → #bf00ff → #ff00aa → #ff5500 → #ffee00` |
| FW / MF / DF / GK | `#f97316` / `#3b82f6` / `#10b981` / `#a855f7` |
| Duelo time 1 (vence) | `#0ea5e9` · (perde) `#1e4e80` |
| Duelo time 2 (vence) | `#f472b6` · (perde) `#7a2d5a` |
| Ref — Média Geral | `#94a3b8` |
| Ref — Média do Cluster | `#0ea5e9` |
| Ref — Máximo | `#fbbf24` |
| Ref — Mínimo | `#6366f1` |

---

## Próximo passo estrito

**Não há backlog técnico aberto. Aguardar instrução do usuário.**

Candidatos naturais caso haja demanda:

1. **Modal/detalhe de jogador** — clicar em um nome no radar ou na tabela abre todos os 40+ KPIs do jogador
2. **Highlight interativo no radar** — ao hover num vértice, destaca a linha poligonal do jogador correspondente
3. **Compartilhamento de estado via URL** — encode dos KPIs e filtros selecionados na querystring
4. **Filtro por fase/grupo** no painel Jogadores — ex.: só seleções que chegaram às semifinais
5. **Conectar GitHub auto-deploy ao projeto `dashboard`** — eliminar a necessidade de rodar `vercel --prod` manualmente a cada push
6. **Ordenação da tabela** no painel Jogadores — clicar em cabeçalho de KPI ordena a tabela por aquela coluna
