import asyncio
import os
import sys
import time
import pandas as pd
from playwright.async_api import async_playwright

# ── Supabase ─────────────────────────────────────────────────────────────────
try:
    import psycopg2 as _psycopg2
    _PSYCOPG2_AVAILABLE = True
except ImportError:
    _PSYCOPG2_AVAILABLE = False

try:
    from supabase import create_client, Client as SupabaseClient
    _SUPABASE_SDK_AVAILABLE = True
except ImportError:
    _SUPABASE_SDK_AVAILABLE = False

_DB_PROJECT_REF = "eeynngvwhhpvkitcecjx"

# Mapeamento de colunas do CSV → schema da tabela disciplina_jogadores
_DISC_COL_MAP = {
    "Posição":                      "ranking",
    "Jogador":                      "nome",
    "País":                         "pais",
    "Posição Campo":                "posicao_campo",
    "Faltas cometidas":             "faltas_cometidas",
    "Faltas sofridas":              "faltas_sofridas",
    "Cartões amarelos":             "cartoes_amarelos",
    "Cartões vermelhos":            "cartoes_vermelhos",
    "Cartões vermelhos indiretos":  "cartoes_vermelhos_indiretos",
    "Impedimentos":                 "impedimentos",
}

def _prepare_records(df: pd.DataFrame) -> list:
    """Normaliza o DataFrame e retorna lista de dicts prontos para inserção."""
    df_db = df.rename(columns=_DISC_COL_MAP).copy()
    int_cols = [
        "ranking", "faltas_cometidas", "faltas_sofridas",
        "cartoes_amarelos", "cartoes_vermelhos",
        "cartoes_vermelhos_indiretos", "impedimentos",
    ]
    for col in int_cols:
        if col in df_db.columns:
            df_db[col] = pd.to_numeric(df_db[col], errors="coerce").fillna(0).astype(int)
    return df_db[list(_DISC_COL_MAP.values())].to_dict(orient="records")

def _upsert_via_psycopg2(records: list) -> bool:
    """UPSERT direto via psycopg2 usando SUPABASE_DB_PASSWORD."""
    db_password = os.environ.get("SUPABASE_DB_PASSWORD", "")
    if not db_password or not _PSYCOPG2_AVAILABLE:
        return False
    try:
        conn = _psycopg2.connect(
            host=f"db.{_DB_PROJECT_REF}.supabase.co",
            port=5432, dbname="postgres", user="postgres",
            password=db_password, sslmode="require", connect_timeout=15,
        )
        conn.autocommit = True
        cols = list(_DISC_COL_MAP.values())
        placeholders = ", ".join(["%s"] * len(cols))
        col_names    = ", ".join(cols)
        update_set   = ", ".join(
            f"{c} = EXCLUDED.{c}" for c in cols if c not in ("nome", "pais")
        )
        sql = f"""
            INSERT INTO public.disciplina_jogadores ({col_names})
            VALUES ({placeholders})
            ON CONFLICT (nome, pais) DO UPDATE SET
                {update_set},
                updated_at = now()
        """
        with conn.cursor() as cur:
            cur.executemany(sql, [tuple(r[c] for c in cols) for r in records])
        conn.close()
        return True
    except Exception as e:
        print(f"  [Supabase/psycopg2] ERRO: {e}")
        return False

def _upsert_via_sdk(records: list) -> bool:
    """UPSERT via supabase-py SDK usando SUPABASE_SERVICE_KEY."""
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key or not _SUPABASE_SDK_AVAILABLE:
        return False
    try:
        client = create_client(url, key)
        BATCH = 500
        for i in range(0, len(records), BATCH):
            client.table("disciplina_jogadores").upsert(
                records[i : i + BATCH], on_conflict="nome,pais"
            ).execute()
        return True
    except Exception as e:
        print(f"  [Supabase/SDK] ERRO: {e}")
        return False

def upsert_disciplina(df: pd.DataFrame) -> None:
    """Faz UPSERT dos dados de disciplina no Supabase.
    Tenta psycopg2 (SUPABASE_DB_PASSWORD) primeiro,
    depois supabase-py SDK (SUPABASE_SERVICE_KEY).
    """
    records = _prepare_records(df)
    total   = len(records)
    print(f"  [Supabase] Enviando {total} registros para disciplina_jogadores...")

    if _upsert_via_psycopg2(records):
        print(f"  [Supabase] {total} registros sincronizados via psycopg2.")
    elif _upsert_via_sdk(records):
        print(f"  [Supabase] {total} registros sincronizados via SDK.")
    else:
        print("  [Supabase] Nenhum metodo de UPSERT disponivel.")
        print("             Defina SUPABASE_DB_PASSWORD ou SUPABASE_SERVICE_KEY.")

# ─────────────────────────────────────────────────────────────────────────────

# Configurações de diretórios
# Em produção (GitHub Actions) usa caminho relativo; localmente usa o caminho absoluto
_BASE = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(_BASE, "Data_Site_Fifa", "Data_Estatisticas_Players")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# URL das estatísticas da FIFA
FIFA_URL = "https://www.fifa.com/pt/tournaments/mens/worldcup/canadamexicousa2026/statistics/player-statistics"

# Mapeamento das Abas com seus botões e arquivos de saída
TABS_CONFIG = [
    {
        "name": "Artilharia",
        "search_str": "Artilheiro",
        "filename": "gols_jogadores.csv"
    },
    {
        "name": "Ataque",
        "search_str": "Ataque",
        "filename": "ataque_jogadores.csv"
    },
    {
        "name": "Distribuição",
        "search_str": "Distribui",
        "filename": "distribuicao_jogadores.csv"
    },
    {
        "name": "Defesa",
        "search_str": "Defesa",
        "filename": "defesa_jogadores.csv"
    },
    {
        "name": "Disciplina",
        "search_str": "Disciplina",
        "filename": "disciplina_jogadores.csv"
    },
    {
        "name": "Goleiro",
        "search_str": "Goleiro",
        "filename": "goleiro_jogadores.csv"
    },
    {
        "name": "Movimentação",
        "search_str": "Moviment",
        "filename": "movimentacao_jogadores.csv"
    },
    {
        "name": "Físico",
        "search_str": "Físico",
        "filename": "fisico_jogadores.csv"
    }
]

async def obter_cabecalho_atual(page):
    """Retorna os textos dos cabeçalhos da tabela atualmente renderizada no DOM."""
    try:
        return await page.evaluate("""() => {
            const table = document.querySelector('table.table');
            if (!table) return null;
            const headerElements = table.querySelectorAll('thead th .cell-label');
            return Array.from(headerElements).map(el => el.innerText.trim());
        }""")
    except Exception:
        return None

async def scrape_tab(page, config, is_first=False):
    name = config["name"]
    search_str = config["search_str"]
    filename = config["filename"]
    
    print(f"\n==========================================")
    print(f" Iniciando coleta da aba: {name}")
    print(f"==========================================")
    
    # 1. Localizar e clicar no botão da aba (apenas se não for a primeira)
    if not is_first:
        tab_btn = page.locator(f"button.filter-chip:has-text('{search_str}'), button:has-text('{search_str}')").first
        if await tab_btn.count() == 0:
            print(f"Erro: Botão para a aba '{name}' não foi encontrado.")
            return
            
        # Salva o cabeçalho atual para detectar quando a tabela mudar de verdade
        headers_anterior = await obter_cabecalho_atual(page)
        print(f"Cabeçalho da aba anterior: {headers_anterior}")
        
        # Tenta clicar e aguardar a mudança do cabeçalho (resiliência contra cliques ignorados pelo React)
        tabela_atualizada = False
        for tentativa_clique in range(3):
            print(f"Clicando na aba '{name}' (tentativa de clique {tentativa_clique+1})...")
            await tab_btn.click()
            
            # Aguarda até 6 segundos pela mudança do cabeçalho no DOM
            for _ in range(12):
                await page.wait_for_timeout(500)
                headers_novo = await obter_cabecalho_atual(page)
                if headers_novo and headers_novo != headers_anterior:
                    print(f"Sucesso! Nova tabela de '{name}' detectada no DOM com cabeçalho: {headers_novo}")
                    tabela_atualizada = True
                    break
            
            if tabela_atualizada:
                break
            print("Aviso: Cabeçalho não mudou. Tentando clicar na aba novamente...")
            
        if not tabela_atualizada:
            print(f"Erro crítico: A tabela não atualizou para a aba '{name}' após 3 tentativas de clique.")
            return
    else:
        print(f"Aba '{name}' já está aberta por padrão. Pulando clique inicial.")
    
    # 2. Esperar o seletor de linhas estar visível no DOM
    row_selector = "table.table tbody tr"
    try:
        await page.wait_for_selector(row_selector, timeout=15000)
    except Exception:
        print(f"Aviso: Timeout aguardando as linhas de dados da aba '{name}'. Tirando screenshot...")
        screenshot_name = f"timeout_{name.lower().replace(' ', '_').replace('ç', 'c').replace('ã', 'a').replace('í', 'i')}.png"
        try:
            await page.screenshot(path=os.path.join(OUTPUT_DIR, screenshot_name))
            print(f"Screenshot salvo em {os.path.join(OUTPUT_DIR, screenshot_name)}")
        except Exception as e:
            print(f"Erro ao salvar screenshot: {e}")
        return

    # 3. Loop de paginação clicando em "Load more"
    click_count = 0
    load_more_selector = "button:has-text('Load more'), button:has-text('Carregar mais'), button[aria-label*='Load'], button.button--has-loader"
    
    while True:
        # Pega a contagem de linhas atual antes de clicar
        current_rows_count = await page.locator(row_selector).count()
        load_more_btn = page.locator(load_more_selector).first
        
        if await load_more_btn.count() > 0 and await load_more_btn.is_visible():
            try:
                # Se o botão estiver ocupado (loading), espera um momento
                is_busy = await load_more_btn.get_attribute("aria-busy") == "true"
                if is_busy:
                    await page.wait_for_timeout(500)
                    continue
                
                # Faz scroll até o botão para garantir visibilidade e clique real
                await load_more_btn.scroll_into_view_if_needed()
                await page.wait_for_timeout(300)
                
                await load_more_btn.click()
                click_count += 1
                print(f"  -> Clicou em 'Load more' ({click_count}). Jogadores visíveis no momento: {current_rows_count}...")
                
                # Aguarda até que o número de linhas aumente
                try:
                    await page.wait_for_function(
                        f"document.querySelectorAll('{row_selector}').length > {current_rows_count}",
                        timeout=8000
                    )
                except Exception:
                    print("  Aviso: O número de linhas não aumentou após o clique. Continuando paginação...")
                    await page.wait_for_timeout(1000)
            except Exception as e:
                print(f"  Erro ao clicar no botão de paginação: {e}. Interrompendo paginação.")
                break
        else:
            print(f"  -> Paginação concluída! Cliques realizados: {click_count}.")
            break
            
    # 4. Extrair os dados de cabeçalho e linhas de forma atômica e rápida via JS
    print("Extraindo os dados de cabeçalho e linhas da tabela...")
    result = await page.evaluate("""() => {
        const table = document.querySelector('table.table');
        if (!table) return null;
        
        // Extrair cabeçalhos
        const headerElements = table.querySelectorAll('thead th .cell-label');
        const headers = Array.from(headerElements).map(el => el.innerText.trim());
        
        // Extrair linhas
        const rows = table.querySelectorAll('tbody tr');
        const data = Array.from(rows).map(row => {
            const rankEl = row.querySelector('td.rank-column .ranking-value');
            const rank = rankEl ? rankEl.innerText.trim() : '';
            
            const nameEl = row.querySelector('td.list-cell-column .main-text');
            const name = nameEl ? nameEl.innerText.trim() : '';
            
            const countryEl = row.querySelector('td.list-cell-column .dsk-description');
            const country = countryEl ? countryEl.innerText.trim() : '';
            
            const posEl = row.querySelector('td.list-cell-column .dsk-description-info');
            const position = posEl ? posEl.innerText.trim() : '';
            
            const metricEls = row.querySelectorAll('td.scrollable-column .value');
            const metrics = Array.from(metricEls).map(el => el.innerText.trim());
            
            return { rank, name, country, position, metrics };
        });
        
        return { headers, data };
    }""")
    
    if not result:
        print(f"Erro: Falha ao extrair tabela via Javascript na aba '{name}'.")
        return
        
    headers = result["headers"]
    raw_rows = result["data"]
    
    if not raw_rows:
        print(f"Aviso: Nenhuma linha foi retornada para a aba '{name}'.")
        return
        
    # 5. Estruturar os dados
    # A coluna "Jogador" contém o nome, país e posição campo.
    # Os cabeçalhos originais vêm como: ['Posição', 'Jogador', 'Métrica1', 'Métrica2', ...]
    # Vamos redefinir as colunas para incluir País e Posição Campo explicitamente:
    cols = ["Posição", "Jogador", "País", "Posição Campo"] + headers[2:]
    
    parsed_data = []
    for r in raw_rows:
        parsed_data.append([
            r["rank"],
            r["name"],
            r["country"],
            r["position"]
        ] + r["metrics"])
        
    # 6. Criar o DataFrame e limpar dados numéricos para BI Analytics
    df = pd.DataFrame(parsed_data, columns=cols)
    
    print(f"Limpar dados e converter tipos para BI na aba '{name}'...")
    for col in df.columns:
        if col not in ["Posição", "Jogador", "País", "Posição Campo"]:
            # Converter para string para operações seguras
            df[col] = df[col].astype(str).str.strip()
            # Limpar unidades comuns no site da FIFA
            df[col] = df[col].str.replace("%", "", regex=False)
            df[col] = df[col].str.replace(" km/h", "", regex=False)
            df[col] = df[col].str.replace(" km", "", regex=False)
            df[col] = df[col].str.replace(",", ".", regex=False)
            df[col] = df[col].replace("-", "0")
            df[col] = df[col].replace("", "0")
            
            # Converter para tipo numérico (int ou float) se possível
            try:
                df[col] = pd.to_numeric(df[col])
            except Exception:
                pass
                
    # 7. Salvar em CSV com utf-8-sig
    file_path = os.path.join(OUTPUT_DIR, filename)
    df.to_csv(file_path, index=False, encoding="utf-8-sig")
    print(f"Sucesso! Arquivo '{filename}' salvo com {len(df)} registros.")

    # 8. Sincronizar com Supabase (somente aba Disciplina)
    if name == "Disciplina":
        upsert_disciplina(df)

async def main():
    print("Iniciando navegador automatizado (modo headless)...")
    async with async_playwright() as p:
        # Launch Chromium headless com flag de evasão de bot
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = await context.new_page()
        
        print("Navegando para a página de estatísticas da FIFA...")
        await page.goto(FIFA_URL, timeout=90000)
        
        # Espera inicial para carregamento da página e tratamento de cookies
        await page.wait_for_timeout(5000)
        
        print("Tratando consentimento de cookies...")
        try:
            for btn_text in ["Concordo", "Permitir todos", "Accept All"]:
                btn = page.locator(f"button:has-text('{btn_text}')").first
                if await btn.count() > 0 and await btn.is_visible():
                    print(f"Clicando no botão de cookies: '{btn_text}'")
                    await btn.click()
                    await page.wait_for_timeout(2000)
                    break
        except Exception as e:
            print(f"Erro ao aceitar cookies: {e}")
            
        # Esperar a tabela inicial de jogadores carregar de verdade (com retry de refresh se der erro)
        print("Aguardando carregamento da tabela inicial...")
        tabela_carregada = False
        row_selector = "table.table tbody tr"
        for tentativa in range(3):
            try:
                await page.wait_for_selector(row_selector, timeout=10000)
                print("Tabela inicial de jogadores detectada com sucesso!")
                tabela_carregada = True
                break
            except Exception:
                print(f"Tentativa {tentativa+1} falhou em carregar a tabela. Recarregando a página...")
                try:
                    await page.reload()
                    await page.wait_for_timeout(5000)
                    # Tenta aceitar cookies de novo
                    for btn_text in ["Concordo", "Permitir todos", "Accept All"]:
                        btn = page.locator(f"button:has-text('{btn_text}')").first
                        if await btn.count() > 0 and await btn.is_visible():
                            await btn.click()
                            await page.wait_for_timeout(2000)
                            break
                except Exception as reload_err:
                    print(f"Erro ao recarregar a página: {reload_err}")
        
        if not tabela_carregada:
            print("Erro crítico: Tabela de dados não carregou após 3 tentativas. Abortando.")
            await browser.close()
            return
            
        # Executar a extração de cada aba sequencialmente
        for idx, config in enumerate(TABS_CONFIG):
            try:
                await scrape_tab(page, config, is_first=(idx == 0))
                # Pausa amigável entre abas
                await page.wait_for_timeout(3000)
            except Exception as e:
                print(f"Erro crítico ao processar aba '{config['name']}': {e}")
                
        await browser.close()
        print("\nProcesso completo finalizado com sucesso!")

if __name__ == "__main__":
    asyncio.run(main())
