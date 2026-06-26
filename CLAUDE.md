# Copa 2026 — Instruções para Claude Code

## Permissões globais deste projeto

O dono deste projeto autoriza Claude Code a executar de forma autônoma:

- Leitura e escrita em todos os arquivos deste repositório
- Execução de comandos Python (`python`, `pip`)
- Execução de comandos git (`git add`, `git commit`, `git push`)
- Execução de comandos PowerShell para build e deploy
- Instalação de pacotes via `pip install` e `npm install`
- Criação e modificação de arquivos de workflow `.github/workflows/`
- Conexão com Supabase (via variáveis de ambiente)
- Deploy na Vercel (via CLI `vercel`)
- Operações no repositório GitHub `denisonabdias/Copa_2026`

---

## Stack do projeto

- **Scraping**: Python + Playwright (Chromium headless)
- **Banco**: Supabase (PostgreSQL) — projeto `eeynngvwhhpvkitcecjx`
- **Automação**: GitHub Actions (`etl_disciplina.yml`) — trigger manual via botão no app
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Deploy**: Vercel (org `modeleiros`)

## Variáveis de ambiente

| Variável | Onde usar |
|---|---|
| `SUPABASE_URL` | Scraper + Next.js |
| `SUPABASE_DB_PASSWORD` | Scraper (psycopg2) |
| `NEXT_PUBLIC_SUPABASE_URL` | Next.js (client-side) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Next.js (leitura pública) |
| `GITHUB_PAT` | Next.js (disparo do workflow via `/api/trigger-scraper`) |

**Importante:** ao setar env vars no Vercel via CLI, usar bash + `printf` — nunca PowerShell pipe (injeta BOM `﻿`):
```bash
printf 'TOKEN' | npx vercel env add GITHUB_PAT production --scope modeleiros --force
```

---

## Arquitetura do frontend

### Divisão Server / Client

Cada painel usa dois componentes separados — sem exceção:

```
PlayerPanel.tsx  (Server Component) — busca dados no Supabase via lib/supabase.ts
  └─ PlayerChart.tsx  (Client Component, "use client") — toda interatividade e SVG

TeamPanel.tsx    (Server Component)
  └─ TeamChart.tsx    (Client Component, "use client")
```

O Server Component só faz `await` nos dados e passa como props. O Client Component recebe os dados prontos e não faz fetch.

### Navegação entre abas

As abas são controladas via `?tab=jogadores` / `?tab=times` no URL — sem estado client. Isso permite SSR correto e compartilhamento de links.

### Gráficos

Todos os gráficos são **SVG puro** — sem biblioteca de charts. Dimensões fixas definidas como constantes no topo do componente (ex: `SVG_W = 760`, `SVG_H = 560`, `CX`, `CY`, `R`).

### Paleta de cores fixas

- **KPIs** (até 3 simultâneos): `["#10b981", "#f97316", "#3b82f6"]` — sempre nesta ordem
- **Posições**: FW `#f97316`, MF `#3b82f6`, DF `#10b981`, GK `#a855f7`
- **Destaque ativo**: `border-emerald-500` (tab ativa)

---

## Banco de dados — padrões

### Tabelas físicas (8 no total)

| Tabela | Fonte |
|---|---|
| `disciplina_jogadores` | Âncora — todas as views fazem LEFT JOIN a partir dela |
| `gols_jogadores` | Artilharia |
| `ataque_jogadores` | Ataque |
| `defesa_jogadores` | Defesa |
| `distribuicao_jogadores` | Distribuição |
| `fisico_jogadores` | Físico |
| `goleiro_jogadores` | Goleiro |
| `movimentacao_jogadores` | Movimentação |

### Chave natural (UPSERT)

Todas as tabelas usam `UNIQUE (nome, pais)` como chave de conflito. NUNCA usar `id` como conflito — ele é serial e não é o identificador real de um jogador.

### Views agregadas

- `stats_completos` — 1 linha por jogador (LEFT JOIN de todas as 8 tabelas a partir de `disciplina_jogadores`)
- `stats_completos_por_time` — 1 linha por seleção (GROUP BY `pais` com SUM e AVG)

**Regra de agregação por time:** usar `SUM` para contagens, `AVG` para percentuais e métricas físicas.

### Após criar views no Supabase via psycopg2

Sempre executar em sequência:
```sql
GRANT SELECT ON public.<view> TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
```

### Nomenclatura de colunas

- Tabelas físicas: nomes literais sem prefixo (`gols`, `passes`, `ranking`)
- Percentuais: sufixo `_pct` (ex: `precisao_passes_pct`, `finalizacoes_convertidas_pct`)
- Goleiro em view: sufixo `_goleiro` (ex: `defesas_goleiro`, `acoes_goleiro_dentro_area`)
- Campos de time em `TimeStatCompleto`: prefixo `total_` para somas, `media_` para médias

### Tipos TypeScript para as views

- `JogadorCompleto` — definido em `dashboard/lib/supabase.ts`
- `TimeStatCompleto` — definido em `dashboard/lib/supabase.ts`

Campos `NUMERIC` do Postgres voltam como string via SDK. A função de query (ex: `getJogadoresCompletos`) converte explicitamente para `Number()` antes de retornar.

---

## Estrutura de KPIs

### Organização em 8 categorias

```
Artilharia | Ataque | Defesa | Distribuição | Disciplina | Físico | Goleiro | Movimentação
```

### Definição de cada KPI

Cada KPI tem **três representações** usadas em lugares diferentes:

```ts
type KpiDef = {
  key: KpiKey;    // chave exata da coluna no banco (ex: "gols", "precisao_passes_pct")
  label: string;  // nome completo exibido nos pills/tooltips (ex: "Precisão Passes (%)")
  short: string;  // abreviação para labels no SVG (ex: "P.Pass", máx ~6 chars)
}
```

### Limites visuais (regras de negócio)

| Limite | Valor |
|---|---|
| KPIs simultâneos nos dois gráficos | 3 |
| Jogadores no radar | 10 |
| Seleções no gráfico de times | 20 |

### Normalização dos eixos

Valor normalizado = `valor / máximo do universo total` — nunca do subconjunto filtrado. Isso garante comparabilidade mesmo ao filtrar por seleção ou posição.

---

## Scraper — padrões

### Arquivo principal: `fifa_scraper.py`

### Configuração por aba: `_UPSERT_CONFIGS`

Dict que mapeia nome da aba (como aparece no site FIFA) → configuração da tabela:

```python
_UPSERT_CONFIGS = {
    "Artilharia": {
        "table": "gols_jogadores",
        "col_map": { "Nome site FIFA": "coluna_banco", ... },  # chaves = nomes em português do site
        "int_cols": [...],    # colunas inteiras (ranking + contagens)
        "float_cols": [...],  # colunas decimais (percentuais, físico)
        "clean": { "coluna_banco": lambda s: ... },  # aplicado APÓS rename
    },
    ...
}
```

**Convenção `clean`:** as funções de limpeza são keyed pelo nome **no banco** (após rename), não pelo nome do site.

### Fluxo do scraper por aba

1. Clicar na aba (com retry de até 3 tentativas detectando mudança de cabeçalho no DOM)
2. Paginar clicando em "Load more" até esgotar
3. Extrair dados via `page.evaluate()` — extração atômica em JS
4. Limpar numéricos: remover `%`, `km/h`, `km`, trocar `,`→`.`, `-`→`0`
5. Salvar CSV em `Data_Site_Fifa/Data_Estatisticas_Players/<tabela>.csv`
6. Chamar `_upsert_table(df, _UPSERT_CONFIGS[name])`

### UPSERT: psycopg2 → SDK (fallback)

Sempre tenta psycopg2 (`SUPABASE_DB_PASSWORD`) primeiro. Cai para supabase-py SDK (`SUPABASE_SERVICE_KEY`) se não disponível. Se nenhum estiver configurado, imprime aviso e segue.

---

## CSVs — formato de saída

- **Diretório:** `Data_Site_Fifa/Data_Estatisticas_Players/`
- **Encoding:** `utf-8-sig` (BOM para compatibilidade com Excel)
- **Nomes de colunas:** em português, exatamente como extraído do site FIFA
  - Fixas: `Posição`, `Jogador`, `País`, `Posição Campo`
  - Métricas: conforme cabeçalho da tabela da aba correspondente
- **Números:** limpos de unidades, vírgula convertida para ponto; `-` e vazio → `0`

---

## GitHub Actions

- **Arquivo:** `.github/workflows/etl_disciplina.yml`
- **Trigger:** `workflow_dispatch` apenas — nunca cron. Razão: evitar bloqueio de IP do fifa.com.
- **Inputs:** `triggered_by` (string, opcional) — preenchido como `"vercel-app"` quando disparado pelo botão do dashboard
- **Artefato:** CSV da execução salvo por 7 dias com nome `disciplina-csv-<run_number>`

O botão "Atualizar Dados" no dashboard chama `POST /api/trigger-scraper`, que usa a GitHub API para disparar o workflow via `GITHUB_PAT`.

---

## Convenções de código

- **Python:** snake_case, sem type hints obrigatórios, variáveis privadas com `_` prefixo
- **Next.js:** App Router, Server Components por padrão, Client Components só quando necessário (interatividade, hooks)
- **Tailwind:** utilitários diretos, sem CSS customizado; dark theme assumido (fundo escuro, texto claro)
- **Commits:** mensagens em português, prefixo `feat/fix/chore/docs`
- **Sem bibliotecas de charts:** SVG puro nos dois gráficos
