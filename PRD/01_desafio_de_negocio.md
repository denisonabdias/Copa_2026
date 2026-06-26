# PRD — Desafio de Negócio

## Copa do Mundo FIFA 2026 · Analytics Dashboard

---

## 1. Contexto

A Copa do Mundo FIFA 2026 (realizada no Canadá, México e EUA) reuniu 48 seleções e mais de 1.000 atletas. O site oficial da FIFA registra estatísticas detalhadas de cada jogador em 8 categorias distintas, atualizadas ao longo do torneio.

Embora os dados sejam públicos, seu acesso estruturado e comparável apresenta obstáculos significativos:

- Distribuídos em 8 abas separadas (Artilharia, Ataque, Defesa, Distribuição, Disciplina, Físico, Goleiro, Movimentação)
- Paginação manual via botão "Carregar mais"
- Ausência de API pública documentada
- Sem capacidade de comparação cruzada entre métricas de abas diferentes
- Sem visão consolidada por seleção

---

## 2. Problema Central

> **Como acessar, estruturar e comparar visualmente as estatísticas de 48 seleções e 900+ jogadores da Copa do Mundo 2026 de forma automatizada, sem depender de exportações manuais ou acesso direto ao FIFA.com a cada consulta?**

---

## 3. Personas

| Persona | Objetivo | Dor Principal |
|---------|---------|---------------|
| **Analista Esportivo** | Gerar relatórios táticos comparando seleções em múltiplas métricas | Horas gastas exportando e cruzando planilhas manualmente |
| **Scout / Observador** | Identificar talentos por posição e estatísticas específicas | Impossibilidade de filtrar jogadores por múltiplos KPIs simultaneamente |
| **Jornalista / Comentarista** | Acessar dados comparativos rapidamente antes de transmissões | Dados dispersos e sem histórico consolidado |
| **Analista de BI** | Demonstrar habilidades com dados esportivos em portfólio | Ausência de projetos end-to-end com dados reais e pipeline completo |
| **Entusiasta / Torcedor Data-Driven** | Explorar estatísticas além das tradicionais (gols, cartões) | Interface da FIFA sem funcionalidade de comparação entre times/jogadores |

---

## 4. Solução Proposta

Pipeline ETL automatizado com interface analítica:

```
FIFA.com (scraping) → PostgreSQL (Supabase) → Dashboard Next.js (Vercel)
```

Três painéis analíticos com propósitos distintos:

| Painel | Tipo de Análise | Dimensões |
|--------|----------------|-----------|
| **Jogadores** | Comparação individual | Até 10 jogadores · 3 KPIs simultâneos · Filtro por seleção e posição |
| **Times** | Visão geral do torneio | Scatter plot com 4 dimensões: X, Y, tamanho e cor (temperatura) |
| **Duelo** | Head-to-head | 40+ KPIs lado a lado entre duas seleções escolhidas |

---

## 5. Critérios de Sucesso

### Técnicos
- [x] Scraper coleta 8 abas sem intervenção manual
- [x] UPSERT idempotente — pode ser re-executado sem duplicar dados
- [x] Pipeline automatizável via GitHub Actions
- [x] Dashboard com tempo de carregamento < 3 segundos
- [x] Dados disponíveis 24/7 via CDN (Vercel)

### Analíticos
- [x] 40+ KPIs disponíveis para comparação
- [x] Comparação de até 10 jogadores simultâneos
- [x] Análise de 4 dimensões simultâneas no painel de times
- [x] Comparação head-to-head de seleções com todos os KPIs
- [x] Seleção e filtros preservados ao navegar entre abas

### Qualidade de Dados
- [x] Normalização de unidades (%, km/h, km removidos)
- [x] Tratamento de valores ausentes (`-` e vazio → `0`)
- [x] Deduplicação via chave natural `UNIQUE(nome, pais)`
- [x] Armazenamento dos CSVs brutos para auditoria

---

## 6. Fora de Escopo

- Predições ou modelos de machine learning
- Dados históricos de copas anteriores
- Perfis individuais de jogadores (páginas próprias)
- Comparação de desempenho por jogo (game-by-game)
- Sistema de autenticação ou usuários

---

## 7. Premissas e Restrições

| Item | Detalhe |
|------|---------|
| **Fonte de dados** | Apenas dados públicos do site oficial fifa.com |
| **Atualização** | Manual via GitHub Actions (evita sobrecarga no servidor da FIFA) |
| **Usuários simultâneos** | Portfólio — não dimensionado para alto volume de acessos |
| **Custo de infraestrutura** | Zero — Supabase free tier + Vercel Hobby plan |
| **Linguagem dos dados** | Português (nomes de colunas e países conforme o site FIFA Brasil) |

---

## 8. Métricas de Acompanhamento

| Métrica | Referência | Status |
|---------|-----------|--------|
| Tabelas preenchidas | 8 / 8 | ✅ |
| Jogadores no banco | 900+ | ✅ |
| Seleções no banco | 48 | ✅ |
| KPIs disponíveis | 40+ | ✅ |
| Painéis implementados | 3 / 3 | ✅ |
| Uptime dashboard | > 99% (Vercel SLA) | ✅ |
| Tempo de atualização | ~20 min (pipeline completo) | ✅ |
