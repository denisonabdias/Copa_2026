# PRD — Modelagem de Dados

## Copa do Mundo FIFA 2026 · Especificação Técnica

---

## 1. Estratégia de Modelagem

O modelo segue um padrão de **esquema estrela adaptado para scraping incremental**:

- Uma **tabela âncora** (`disciplina_jogadores`) garante que todo jogador scrapeado tenha ao menos um registro
- Sete **tabelas satélite** armazenam cada categoria estatística de forma independente
- Dois **views agregadas** consolidam os dados para consumo pelo dashboard

Esse design permite que o scraper execute abas de forma independente — se a aba "Físico" falhar, os dados das demais abas já persistidos não são afetados.

---

## 2. Tabelas Físicas

### Tabela Âncora

```sql
-- disciplina_jogadores
CREATE TABLE disciplina_jogadores (
  id                          SERIAL PRIMARY KEY,
  ranking                     INT,
  nome                        TEXT        NOT NULL,
  pais                        TEXT        NOT NULL,
  posicao_campo               TEXT,           -- FW, MF, DF, GK
  faltas_cometidas            NUMERIC,
  faltas_sofridas             NUMERIC,
  cartoes_amarelos            NUMERIC,
  cartoes_vermelhos           NUMERIC,
  cartoes_vermelhos_indiretos NUMERIC,
  impedimentos                NUMERIC,
  UNIQUE (nome, pais)         -- chave natural para UPSERT
);
```

### Tabelas Satélite

```sql
-- gols_jogadores
CREATE TABLE gols_jogadores (
  nome                        TEXT NOT NULL,
  pais                        TEXT NOT NULL,
  gols                        NUMERIC,
  assistencias                NUMERIC,
  minutos_jogados             NUMERIC,
  UNIQUE (nome, pais)
);

-- ataque_jogadores
CREATE TABLE ataque_jogadores (
  nome                        TEXT NOT NULL,
  pais                        TEXT NOT NULL,
  finalizacoes                NUMERIC,
  finalizacoes_certas         NUMERIC,
  finalizacoes_convertidas_pct NUMERIC,
  assistencias                NUMERIC,
  chutes_na_area              NUMERIC,
  chutes_fora_area            NUMERIC,
  cabeceos_a_gol              NUMERIC,
  ge                          NUMERIC,
  escanteios                  NUMERIC,
  UNIQUE (nome, pais)
);

-- defesa_jogadores
CREATE TABLE defesa_jogadores (
  nome                        TEXT NOT NULL,
  pais                        TEXT NOT NULL,
  perdas_bola_forcadas        NUMERIC,
  pressoes_defensivas         NUMERIC,
  pressoes_defensivas_diretas NUMERIC,
  gols_contra                 NUMERIC,
  UNIQUE (nome, pais)
);

-- distribuicao_jogadores
CREATE TABLE distribuicao_jogadores (
  nome                        TEXT NOT NULL,
  pais                        TEXT NOT NULL,
  passes                      NUMERIC,
  precisao_passes_pct         NUMERIC,
  cruzamentos                 NUMERIC,
  tentativas_ruptura_linha    NUMERIC,
  tentativas_mudanca_direcao  NUMERIC,
  UNIQUE (nome, pais)
);

-- fisico_jogadores
CREATE TABLE fisico_jogadores (
  nome                        TEXT NOT NULL,
  pais                        TEXT NOT NULL,
  corridas_alta_velocidade    NUMERIC,
  arrancadas                  NUMERIC,
  velocidade                  NUMERIC,      -- km/h
  distancia_total             NUMERIC,      -- metros
  UNIQUE (nome, pais)
);

-- goleiro_jogadores
CREATE TABLE goleiro_jogadores (
  nome                        TEXT NOT NULL,
  pais                        TEXT NOT NULL,
  defesas                     NUMERIC,
  acoes_dentro_area           NUMERIC,
  acoes_fora_area             NUMERIC,
  UNIQUE (nome, pais)
);

-- movimentacao_jogadores
CREATE TABLE movimentacao_jogadores (
  nome                        TEXT NOT NULL,
  pais                        TEXT NOT NULL,
  pedidos_bola                NUMERIC,
  pedidos_frente              NUMERIC,
  pedidos_entre               NUMERIC,
  recepcoes_entre_linhas      NUMERIC,
  recepcoes_sob_pressao       NUMERIC,
  participacoes               NUMERIC,
  UNIQUE (nome, pais)
);
```

---

## 3. Views Agregadas

### 3.1 `stats_completos` — Por Jogador

```sql
CREATE VIEW stats_completos AS
SELECT
  d.id,
  d.ranking,
  d.nome,
  d.pais,
  d.posicao_campo,
  -- Disciplina
  d.faltas_cometidas,
  d.faltas_sofridas,
  d.cartoes_amarelos,
  d.cartoes_vermelhos,
  d.cartoes_vermelhos_indiretos,
  d.impedimentos,
  -- Artilharia
  g.gols,
  g.assistencias          AS assistencias_artilharia,
  g.minutos_jogados,
  -- Ataque
  a.finalizacoes_certas,
  a.finalizacoes,
  a.assistencias          AS assistencias_ataque,
  a.chutes_na_area,
  a.chutes_fora_area,
  a.cabeceos_a_gol,
  a.ge,
  a.escanteios,
  -- Defesa
  def.perdas_bola_forcadas,
  def.pressoes_defensivas,
  def.pressoes_defensivas_diretas,
  def.gols_contra,
  -- Distribuição
  dist.passes,
  dist.precisao_passes_pct,
  dist.cruzamentos,
  dist.tentativas_ruptura_linha,
  dist.tentativas_mudanca_direcao,
  -- Físico
  f.corridas_alta_velocidade,
  f.arrancadas,
  f.velocidade,
  f.distancia_total,
  -- Goleiro (sufixo _goleiro para evitar ambiguidade)
  go.defesas              AS defesas_goleiro,
  go.acoes_dentro_area    AS acoes_goleiro_dentro_area,
  go.acoes_fora_area      AS acoes_goleiro_fora_area,
  -- Movimentação
  m.pedidos_bola,
  m.pedidos_frente,
  m.pedidos_entre,
  m.recepcoes_entre_linhas,
  m.recepcoes_sob_pressao,
  m.participacoes
FROM disciplina_jogadores d
LEFT JOIN gols_jogadores          g    ON g.nome    = d.nome    AND g.pais    = d.pais
LEFT JOIN ataque_jogadores        a    ON a.nome    = d.nome    AND a.pais    = d.pais
LEFT JOIN defesa_jogadores        def  ON def.nome  = d.nome    AND def.pais  = d.pais
LEFT JOIN distribuicao_jogadores  dist ON dist.nome = d.nome    AND dist.pais = d.pais
LEFT JOIN fisico_jogadores        f    ON f.nome    = d.nome    AND f.pais    = d.pais
LEFT JOIN goleiro_jogadores       go   ON go.nome   = d.nome    AND go.pais   = d.pais
LEFT JOIN movimentacao_jogadores  m    ON m.nome    = d.nome    AND m.pais    = d.pais;

GRANT SELECT ON public.stats_completos TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
```

### 3.2 `stats_completos_por_time` — Por Seleção

```sql
CREATE VIEW stats_completos_por_time AS
SELECT
  pais,
  -- Contagens absolutas → SUM
  SUM(faltas_cometidas)              AS total_faltas_cometidas,
  SUM(cartoes_amarelos)              AS total_cartoes_amarelos,
  SUM(gols)                          AS total_gols,
  SUM(finalizacoes)                  AS total_finalizacoes,
  SUM(passes)                        AS total_passes,
  -- Percentuais e métricas físicas → AVG
  AVG(precisao_passes_pct)           AS media_precisao_passes_pct,
  AVG(velocidade)                    AS media_velocidade,
  AVG(distancia_total)               AS media_distancia_total,
  AVG(ge)                            AS media_ge
  -- ... (demais colunas seguem a mesma lógica)
FROM stats_completos
GROUP BY pais;

GRANT SELECT ON public.stats_completos_por_time TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
```

**Regra de agregação:**
| Tipo de métrica | Agregação | Exemplo |
|----------------|-----------|---------|
| Contagens e totais | `SUM` | gols, passes, faltas |
| Percentuais | `AVG` | precisao_passes_pct |
| Métricas físicas | `AVG` | velocidade, distancia_total |

---

## 4. UPSERT Pattern

```python
# Python — psycopg2 UPSERT genérico
query = f"""
    INSERT INTO {table} ({cols})
    VALUES ({placeholders})
    ON CONFLICT (nome, pais)
    DO UPDATE SET {updates}
"""

# Chave de conflito: NUNCA usar id (serial)
# Usar sempre a chave natural: UNIQUE (nome, pais)
```

**Por que não usar `id` como chave de conflito?**

O `id` é um SERIAL gerado pelo banco. Na segunda execução do scraper, o mesmo jogador receberia um `id` diferente, tornando o UPSERT ineficaz e criando duplicatas.

---

## 5. Convenções de Nomenclatura

### Tabelas

| Padrão | Formato | Exemplo |
|--------|---------|---------|
| Tabelas físicas | `{categoria}_jogadores` | `gols_jogadores`, `fisico_jogadores` |

### Colunas

| Padrão | Sufixo/Prefixo | Exemplo |
|--------|---------------|---------|
| Percentual | `_pct` | `precisao_passes_pct`, `finalizacoes_convertidas_pct` |
| Goleiro em views | `_goleiro` | `defesas_goleiro`, `acoes_goleiro_dentro_area` |
| Soma em view de times | `total_` | `total_gols`, `total_passes` |
| Média em view de times | `media_` | `media_velocidade`, `media_ge` |

### Tipos TypeScript

Campos `NUMERIC` do PostgreSQL retornam como `string` via Supabase SDK. A camada de query (`lib/supabase.ts`) converte explicitamente:

```typescript
// Antes de retornar ao componente:
gols:              Number(row.gols)              || 0,
precisao_passes_pct: Number(row.precisao_passes_pct) || 0,
```

---

## 6. Mapeamento Scraper → Banco

Cada aba do site FIFA possui nomes de colunas em português (conforme exibidos na interface). O scraper usa um `col_map` por aba para renomear as colunas:

```python
_UPSERT_CONFIGS = {
    "Artilharia": {
        "table": "gols_jogadores",
        "col_map": {
            "Jogador":     "nome",
            "País":        "pais",
            "Gols":        "gols",
            "Assistências":"assistencias",
            "Min. Jogados":"minutos_jogados",
        },
        "int_cols":   ["ranking", "gols", "assistencias", "minutos_jogados"],
        "float_cols": [],
    },
    # ... demais abas
}
```

**Funções de limpeza** (`clean`) são aplicadas **após** o rename — keyed pelo nome da coluna no banco, não pelo nome do site.

---

## 7. Fluxo de Dados Completo

```
Site FIFA (HTML/JS)
       │
       │  page.evaluate()  — extração atômica em JavaScript no browser
       ▼
DataFrame pandas (colunas em português)
       │
       │  col_map  — rename → nomes do banco
       │  clean()  — normalização de valores
       │  type coercion — int / float / 0
       ▼
List[dict] — records prontos para UPSERT
       │
       ├── psycopg2 (primário) — UPSERT via SQL direto
       └── supabase-py (fallback) — upsert via REST API
                │
                ▼
          PostgreSQL (Supabase)
                │
                │  views com LEFT JOIN
                ▼
          Supabase REST API (PostgREST)
                │
                │  Supabase JS SDK
                ▼
          Next.js Server Component
                │
                │  props → Client Component
                ▼
          SVG interativo no browser
```
