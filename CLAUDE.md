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

## Stack do projeto

- **Scraping**: Python + Playwright
- **Banco**: Supabase (PostgreSQL) — projeto `eeynngvwhhpvkitcecjx`
- **Automação**: GitHub Actions (trigger manual via botão no app)
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Deploy**: Vercel

## Variáveis de ambiente necessárias

| Variável | Onde usar |
|---|---|
| `SUPABASE_URL` | Scraper + Next.js |
| `SUPABASE_DB_PASSWORD` | Scraper (psycopg2) |
| `SUPABASE_ANON_KEY` | Next.js (leitura pública) |
| `GITHUB_PAT` | Next.js (disparo do workflow) |

## Convenções de código

- Python: snake_case, sem type hints obrigatórios
- Next.js: App Router, Server Components por padrão
- Tailwind: utilitários diretos, sem CSS customizado desnecessário
- Commits: português, prefixo `feat/fix/chore/docs`
