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

# Configuração de UPSERT para cada aba — col_map usa nomes do site FIFA → nomes da tabela
# clean: funções aplicadas após rename, keyed pelo nome da coluna no banco
_UPSERT_CONFIGS = {
    "Artilharia": {
        "table": "gols_jogadores",
        "col_map": {
            "Posição": "ranking",
            "Jogador": "nome",
            "País": "pais",
            "Posição Campo": "posicao_campo",
            "Gols": "gols",
            "Assistências": "assistencias",
            "Minutos jogados": "minutos_jogados",
        },
        "int_cols": ["ranking", "gols", "assistencias", "minutos_jogados"],
        "float_cols": [],
        "clean": {},
    },
    "Ataque": {
        "table": "ataque_jogadores",
        "col_map": {
            "Posição": "ranking",
            "Jogador": "nome",
            "País": "pais",
            "Posição Campo": "posicao_campo",
            "Assistências": "assistencias",
            "Finalizações certas": "finalizacoes_certas",
            "Finalizações": "finalizacoes",
            "Finalizações convertidas Porcentagem (%)": "finalizacoes_convertidas_pct",
            "Chutes na área": "chutes_na_area",
            "Chutes fora da área": "chutes_fora_area",
            "Cabeceios a gol": "cabeceos_a_gol",
            "GE": "ge",
            "Eficiência em GE": "eficiencia_ge",
            "Escanteios": "escanteios",
        },
        "int_cols": ["ranking", "assistencias", "finalizacoes_certas", "finalizacoes",
                     "chutes_na_area", "chutes_fora_area", "cabeceos_a_gol",
                     "eficiencia_ge", "escanteios"],
        "float_cols": ["finalizacoes_convertidas_pct", "ge"],
        "clean": {"eficiencia_ge": lambda s: str(s).replace("x", "").strip()},
    },
    "Defesa": {
        "table": "defesa_jogadores",
        "col_map": {
            "Posição": "ranking",
            "Jogador": "nome",
            "País": "pais",
            "Posição Campo": "posicao_campo",
            "Gols contra": "gols_contra",
            "Perdas de bola forçadas": "perdas_bola_forcadas",
            "Pressões defensivas exercidas": "pressoes_defensivas",
            "Pressões defensivas exercidas diretamente": "pressoes_defensivas_diretas",
        },
        "int_cols": ["ranking", "gols_contra", "perdas_bola_forcadas",
                     "pressoes_defensivas", "pressoes_defensivas_diretas"],
        "float_cols": [],
        "clean": {},
    },
    "Distribuição": {
        "table": "distribuicao_jogadores",
        "col_map": {
            "Posição": "ranking",
            "Jogador": "nome",
            "País": "pais",
            "Posição Campo": "posicao_campo",
            "Passes": "passes",
            "Precisão dos passes (%)": "precisao_passes_pct",
            "Cruzamentos": "cruzamentos",
            "Precisão dos cruzamentos (%)": "precisao_cruzamentos_pct",
            "Tentativas de ruptura da linha defensiva": "tentativas_ruptura_linha",
            "Precisão das rupturas da linha defensiva ((%))": "precisao_ruptura_linha_pct",
            "Tentativas de mudança de direção do jogo": "tentativas_mudanca_direcao",
            "Precisão das mudanças de direção do jogo ((%))": "precisao_mudanca_direcao_pct",
        },
        "int_cols": ["ranking", "passes", "cruzamentos",
                     "tentativas_ruptura_linha", "tentativas_mudanca_direcao"],
        "float_cols": ["precisao_passes_pct", "precisao_cruzamentos_pct",
                       "precisao_ruptura_linha_pct", "precisao_mudanca_direcao_pct"],
        "clean": {},
    },
    "Disciplina": {
        "table": "disciplina_jogadores",
        "col_map": {
            "Posição":                     "ranking",
            "Jogador":                     "nome",
            "País":                        "pais",
            "Posição Campo":               "posicao_campo",
            "Faltas cometidas":            "faltas_cometidas",
            "Faltas sofridas":             "faltas_sofridas",
            "Cartões amarelos":            "cartoes_amarelos",
            "Cartões vermelhos":           "cartoes_vermelhos",
            "Cartões vermelhos indiretos": "cartoes_vermelhos_indiretos",
            "Impedimentos":                "impedimentos",
        },
        "int_cols": ["ranking", "faltas_cometidas", "faltas_sofridas",
                     "cartoes_amarelos", "cartoes_vermelhos",
                     "cartoes_vermelhos_indiretos", "impedimentos"],
        "float_cols": [],
        "clean": {},
    },
    "Goleiro": {
        "table": "goleiro_jogadores",
        "col_map": {
            "Posição": "ranking",
            "Jogador": "nome",
            "País": "pais",
            "Posição Campo": "posicao_campo",
            "Defesas da goleira": "defesas",
            "Ações do goleiro dentro da área penal": "acoes_dentro_area",
            "Ações do goleiro fora da área penal": "acoes_fora_area",
        },
        "int_cols": ["ranking", "defesas", "acoes_dentro_area", "acoes_fora_area"],
        "float_cols": [],
        "clean": {},
    },
    "Movimentação": {
        "table": "movimentacao_jogadores",
        "col_map": {
            "Posição": "ranking",
            "Jogador": "nome",
            "País": "pais",
            "Posição Campo": "posicao_campo",
            "Pedidos de bola": "pedidos_bola",
            "Pedidos atrás": "pedidos_atras",
            "Pedidos entre": "pedidos_entre",
            "Pedidos na frente": "pedidos_frente",
            "Pedidos dentro da forma coletiva": "pedidos_dentro_forma_coletiva",
            "Pedidos fora da forma coletiva": "pedidos_fora_forma_coletiva",
            "Recepções atrás": "recepcoes_atras",
            "Recepções entre as linhas defensiva e de meio-campo": "recepcoes_entre_linhas",
            "Recepções sob pressão": "recepcoes_sob_pressao",
            "Participações do jogador": "participacoes",
        },
        "int_cols": ["ranking", "pedidos_bola", "pedidos_atras", "pedidos_entre",
                     "pedidos_frente", "pedidos_dentro_forma_coletiva",
                     "pedidos_fora_forma_coletiva", "recepcoes_atras",
                     "recepcoes_entre_linhas", "recepcoes_sob_pressao", "participacoes"],
        "float_cols": [],
        "clean": {},
    },
    "Físico": {
        "table": "fisico_jogadores",
        "col_map": {
            "Posição": "ranking",
            "Jogador": "nome",
            "País": "pais",
            "Posição Campo": "posicao_campo",
            "Velocidade média (km/h)": "velocidade_media",
            "Corridas em alta velocidade": "corridas_alta_velocidade",
            "Arrancadas": "arrancadas",
            "Distância total (m)": "distancia_total",
        },
        "int_cols": ["ranking", "corridas_alta_velocidade", "arrancadas"],
        "float_cols": ["velocidade_media", "distancia_total"],
        "clean": {},
    },
}


def _upsert_table(df: pd.DataFrame, cfg: dict) -> None:
    """UPSERT genérico para qualquer aba.
    Tenta psycopg2 (SUPABASE_DB_PASSWORD) primeiro,
    depois supabase-py SDK (SUPABASE_SERVICE_KEY).
    """
    table = cfg["table"]
    col_map = cfg["col_map"]

    # Renomeia apenas colunas presentes no df
    existing_map = {k: v for k, v in col_map.items() if k in df.columns}
    df_db = df.rename(columns=existing_map).copy()
    db_cols = [v for v in col_map.values() if v in df_db.columns]

    # Aplica funções de limpeza específicas (ex: remover "x" de eficiencia_ge)
    for col, fn in cfg.get("clean", {}).items():
        if col in df_db.columns:
            df_db[col] = df_db[col].apply(fn)

    # Converte tipos
    for col in cfg.get("int_cols", []):
        if col in df_db.columns:
            df_db[col] = pd.to_numeric(df_db[col], errors="coerce").fillna(0).astype(int)
    for col in cfg.get("float_cols", []):
        if col in df_db.columns:
            df_db[col] = pd.to_numeric(df_db[col], errors="coerce").fillna(0).astype(float)

    # Filtra linhas sem nome ou país
    df_db = df_db[df_db["nome"].astype(str).str.strip().astype(bool)
                  & df_db["pais"].astype(str).str.strip().astype(bool)]

    records = df_db[db_cols].to_dict(orient="records")
    total = len(records)
    print(f"  [Supabase] Enviando {total} registros para {table}...")

    if _upsert_via_psycopg2_generic(records, table, db_cols):
        print(f"  [Supabase] {total} registros sincronizados via psycopg2.")
    elif _upsert_via_sdk_generic(records, table):
        print(f"  [Supabase] {total} registros sincronizados via SDK.")
    else:
        print("  [Supabase] Nenhum metodo de UPSERT disponivel.")
        print("             Defina SUPABASE_DB_PASSWORD ou SUPABASE_SERVICE_KEY.")


def _upsert_via_psycopg2_generic(records: list, table: str, cols: list) -> bool:
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
        placeholders = ", ".join(["%s"] * len(cols))
        col_names    = ", ".join(cols)
        update_set   = ", ".join(
            f"{c} = EXCLUDED.{c}" for c in cols if c not in ("nome", "pais")
        )
        sql = f"""
            INSERT INTO public.{table} ({col_names})
            VALUES ({placeholders})
            ON CONFLICT (nome, pais) DO UPDATE SET
                {update_set},
                updated_at = now()
        """
        with conn.cursor() as cur:
            cur.executemany(sql, [tuple(r.get(c) for c in cols) for r in records])
        conn.close()
        return True
    except Exception as e:
        print(f"  [Supabase/psycopg2] ERRO: {e}")
        return False


def _upsert_via_sdk_generic(records: list, table: str) -> bool:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key or not _SUPABASE_SDK_AVAILABLE:
        return False
    try:
        client = create_client(url, key)
        BATCH = 500
        for i in range(0, len(records), BATCH):
            client.table(table).upsert(
                records[i : i + BATCH], on_conflict="nome,pais"
            ).execute()
        return True
    except Exception as e:
        print(f"  [Supabase/SDK] ERRO: {e}")
        return False

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

    # 8. Sincronizar com Supabase
    if name in _UPSERT_CONFIGS:
        _upsert_table(df, _UPSERT_CONFIGS[name])

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
