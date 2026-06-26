#!/usr/bin/env python3
"""
Etapa 4 — Cria as 7 tabelas adicionais no Supabase e faz upload dos CSVs.
Uso: python etapa4_setup.py --db-password "sua_senha"
"""
import argparse
import os
import sys
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

DB_PROJECT_REF = "eeynngvwhhpvkitcecjx"
BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
CSV_DIR        = os.path.join(BASE_DIR, "Data_Site_Fifa", "Data_Estatisticas_Players")

# ── DDL ──────────────────────────────────────────────────────────────────────

DDL_TABLES = """
CREATE TABLE IF NOT EXISTS public.gols_jogadores (
    id              SERIAL PRIMARY KEY,
    ranking         INTEGER      NOT NULL,
    nome            TEXT         NOT NULL,
    pais            TEXT         NOT NULL,
    posicao_campo   TEXT,
    gols            INTEGER      DEFAULT 0,
    assistencias    INTEGER      DEFAULT 0,
    minutos_jogados INTEGER      DEFAULT 0,
    updated_at      TIMESTAMPTZ  DEFAULT now(),
    UNIQUE (nome, pais)
);

CREATE TABLE IF NOT EXISTS public.ataque_jogadores (
    id                            SERIAL PRIMARY KEY,
    ranking                       INTEGER      NOT NULL,
    nome                          TEXT         NOT NULL,
    pais                          TEXT         NOT NULL,
    posicao_campo                 TEXT,
    assistencias                  INTEGER      DEFAULT 0,
    finalizacoes_certas           INTEGER      DEFAULT 0,
    finalizacoes                  INTEGER      DEFAULT 0,
    finalizacoes_convertidas_pct  NUMERIC(6,2) DEFAULT 0,
    chutes_na_area                INTEGER      DEFAULT 0,
    chutes_fora_area              INTEGER      DEFAULT 0,
    cabeceos_a_gol                INTEGER      DEFAULT 0,
    ge                            NUMERIC(6,2) DEFAULT 0,
    eficiencia_ge                 INTEGER      DEFAULT 0,
    escanteios                    INTEGER      DEFAULT 0,
    updated_at                    TIMESTAMPTZ  DEFAULT now(),
    UNIQUE (nome, pais)
);

CREATE TABLE IF NOT EXISTS public.defesa_jogadores (
    id                           SERIAL PRIMARY KEY,
    ranking                      INTEGER      NOT NULL,
    nome                         TEXT         NOT NULL,
    pais                         TEXT         NOT NULL,
    posicao_campo                TEXT,
    gols_contra                  INTEGER      DEFAULT 0,
    perdas_bola_forcadas         INTEGER      DEFAULT 0,
    pressoes_defensivas          INTEGER      DEFAULT 0,
    pressoes_defensivas_diretas  INTEGER      DEFAULT 0,
    updated_at                   TIMESTAMPTZ  DEFAULT now(),
    UNIQUE (nome, pais)
);

CREATE TABLE IF NOT EXISTS public.distribuicao_jogadores (
    id                            SERIAL PRIMARY KEY,
    ranking                       INTEGER      NOT NULL,
    nome                          TEXT         NOT NULL,
    pais                          TEXT         NOT NULL,
    posicao_campo                 TEXT,
    passes                        INTEGER      DEFAULT 0,
    precisao_passes_pct           NUMERIC(5,2) DEFAULT 0,
    cruzamentos                   INTEGER      DEFAULT 0,
    precisao_cruzamentos_pct      NUMERIC(5,2) DEFAULT 0,
    tentativas_ruptura_linha      INTEGER      DEFAULT 0,
    precisao_ruptura_linha_pct    NUMERIC(5,2) DEFAULT 0,
    tentativas_mudanca_direcao    INTEGER      DEFAULT 0,
    precisao_mudanca_direcao_pct  NUMERIC(5,2) DEFAULT 0,
    updated_at                    TIMESTAMPTZ  DEFAULT now(),
    UNIQUE (nome, pais)
);

CREATE TABLE IF NOT EXISTS public.fisico_jogadores (
    id                       SERIAL PRIMARY KEY,
    ranking                  INTEGER       NOT NULL,
    nome                     TEXT          NOT NULL,
    pais                     TEXT          NOT NULL,
    posicao_campo            TEXT,
    velocidade_media         NUMERIC(5,2)  DEFAULT 0,
    corridas_alta_velocidade INTEGER       DEFAULT 0,
    arrancadas               INTEGER       DEFAULT 0,
    distancia_total          NUMERIC(10,2) DEFAULT 0,
    updated_at               TIMESTAMPTZ   DEFAULT now(),
    UNIQUE (nome, pais)
);

CREATE TABLE IF NOT EXISTS public.goleiro_jogadores (
    id                 SERIAL PRIMARY KEY,
    ranking            INTEGER      NOT NULL,
    nome               TEXT         NOT NULL,
    pais               TEXT         NOT NULL,
    posicao_campo      TEXT,
    defesas            INTEGER      DEFAULT 0,
    acoes_dentro_area  INTEGER      DEFAULT 0,
    acoes_fora_area    INTEGER      DEFAULT 0,
    updated_at         TIMESTAMPTZ  DEFAULT now(),
    UNIQUE (nome, pais)
);

CREATE TABLE IF NOT EXISTS public.movimentacao_jogadores (
    id                            SERIAL PRIMARY KEY,
    ranking                       INTEGER      NOT NULL,
    nome                          TEXT         NOT NULL,
    pais                          TEXT         NOT NULL,
    posicao_campo                 TEXT,
    pedidos_bola                  INTEGER      DEFAULT 0,
    pedidos_atras                 INTEGER      DEFAULT 0,
    pedidos_entre                 INTEGER      DEFAULT 0,
    pedidos_frente                INTEGER      DEFAULT 0,
    pedidos_dentro_forma_coletiva INTEGER      DEFAULT 0,
    pedidos_fora_forma_coletiva   INTEGER      DEFAULT 0,
    recepcoes_atras               INTEGER      DEFAULT 0,
    recepcoes_entre_linhas        INTEGER      DEFAULT 0,
    recepcoes_sob_pressao         INTEGER      DEFAULT 0,
    participacoes                 INTEGER      DEFAULT 0,
    updated_at                    TIMESTAMPTZ  DEFAULT now(),
    UNIQUE (nome, pais)
);
"""

VIEW_DDL = """
CREATE OR REPLACE VIEW public.stats_completos AS
SELECT
    d.id, d.ranking, d.nome, d.pais, d.posicao_campo,
    -- Disciplina
    d.faltas_cometidas, d.faltas_sofridas,
    d.cartoes_amarelos, d.cartoes_vermelhos,
    d.cartoes_vermelhos_indiretos, d.impedimentos,
    -- Artilharia
    COALESCE(g.gols, 0)             AS gols,
    COALESCE(g.assistencias, 0)     AS assistencias_artilharia,
    COALESCE(g.minutos_jogados, 0)  AS minutos_jogados,
    -- Ataque
    COALESCE(a.assistencias, 0)                  AS assistencias_ataque,
    COALESCE(a.finalizacoes_certas, 0)           AS finalizacoes_certas,
    COALESCE(a.finalizacoes, 0)                  AS finalizacoes,
    COALESCE(a.finalizacoes_convertidas_pct, 0)  AS finalizacoes_convertidas_pct,
    COALESCE(a.chutes_na_area, 0)                AS chutes_na_area,
    COALESCE(a.chutes_fora_area, 0)              AS chutes_fora_area,
    COALESCE(a.cabeceos_a_gol, 0)                AS cabeceos_a_gol,
    COALESCE(a.ge, 0)                            AS ge,
    COALESCE(a.eficiencia_ge, 0)                 AS eficiencia_ge,
    COALESCE(a.escanteios, 0)                    AS escanteios,
    -- Defesa
    COALESCE(def.gols_contra, 0)                AS gols_contra,
    COALESCE(def.perdas_bola_forcadas, 0)        AS perdas_bola_forcadas,
    COALESCE(def.pressoes_defensivas, 0)         AS pressoes_defensivas,
    COALESCE(def.pressoes_defensivas_diretas, 0) AS pressoes_defensivas_diretas,
    -- Distribuição
    COALESCE(dist.passes, 0)                       AS passes,
    COALESCE(dist.precisao_passes_pct, 0)          AS precisao_passes_pct,
    COALESCE(dist.cruzamentos, 0)                  AS cruzamentos,
    COALESCE(dist.precisao_cruzamentos_pct, 0)     AS precisao_cruzamentos_pct,
    COALESCE(dist.tentativas_ruptura_linha, 0)     AS tentativas_ruptura_linha,
    COALESCE(dist.precisao_ruptura_linha_pct, 0)   AS precisao_ruptura_linha_pct,
    COALESCE(dist.tentativas_mudanca_direcao, 0)   AS tentativas_mudanca_direcao,
    COALESCE(dist.precisao_mudanca_direcao_pct, 0) AS precisao_mudanca_direcao_pct,
    -- Físico
    COALESCE(f.velocidade_media, 0)             AS velocidade_media,
    COALESCE(f.corridas_alta_velocidade, 0)     AS corridas_alta_velocidade,
    COALESCE(f.arrancadas, 0)                   AS arrancadas,
    COALESCE(f.distancia_total, 0)              AS distancia_total,
    -- Goleiro
    COALESCE(gk.defesas, 0)           AS defesas_goleiro,
    COALESCE(gk.acoes_dentro_area, 0) AS acoes_goleiro_dentro_area,
    COALESCE(gk.acoes_fora_area, 0)   AS acoes_goleiro_fora_area,
    -- Movimentação
    COALESCE(m.pedidos_bola, 0)                  AS pedidos_bola,
    COALESCE(m.pedidos_atras, 0)                 AS pedidos_atras,
    COALESCE(m.pedidos_entre, 0)                 AS pedidos_entre,
    COALESCE(m.pedidos_frente, 0)                AS pedidos_frente,
    COALESCE(m.pedidos_dentro_forma_coletiva, 0) AS pedidos_dentro_forma_coletiva,
    COALESCE(m.pedidos_fora_forma_coletiva, 0)   AS pedidos_fora_forma_coletiva,
    COALESCE(m.recepcoes_atras, 0)               AS recepcoes_atras,
    COALESCE(m.recepcoes_entre_linhas, 0)        AS recepcoes_entre_linhas,
    COALESCE(m.recepcoes_sob_pressao, 0)         AS recepcoes_sob_pressao,
    COALESCE(m.participacoes, 0)                 AS participacoes,
    d.updated_at
FROM public.disciplina_jogadores d
LEFT JOIN public.gols_jogadores          g    ON g.nome    = d.nome AND g.pais    = d.pais
LEFT JOIN public.ataque_jogadores        a    ON a.nome    = d.nome AND a.pais    = d.pais
LEFT JOIN public.defesa_jogadores        def  ON def.nome  = d.nome AND def.pais  = d.pais
LEFT JOIN public.distribuicao_jogadores  dist ON dist.nome = d.nome AND dist.pais = d.pais
LEFT JOIN public.fisico_jogadores        f    ON f.nome    = d.nome AND f.pais    = d.pais
LEFT JOIN public.goleiro_jogadores       gk   ON gk.nome   = d.nome AND gk.pais   = d.pais
LEFT JOIN public.movimentacao_jogadores  m    ON m.nome    = d.nome AND m.pais    = d.pais;
"""

TABLES = [
    "gols_jogadores", "ataque_jogadores", "defesa_jogadores",
    "distribuicao_jogadores", "fisico_jogadores",
    "goleiro_jogadores", "movimentacao_jogadores",
]

# ── Upload config ─────────────────────────────────────────────────────────────

UPLOADS = [
    {
        "csv": "gols_jogadores.csv",
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
        "int_cols":   ["ranking", "gols", "assistencias", "minutos_jogados"],
        "float_cols": [],
        "clean": {},
    },
    {
        "csv": "ataque_jogadores.csv",
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
    {
        "csv": "defesa_jogadores.csv",
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
    {
        "csv": "distribuicao_jogadores.csv",
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
    {
        "csv": "fisico_jogadores.csv",
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
        "int_cols":   ["ranking", "corridas_alta_velocidade", "arrancadas"],
        "float_cols": ["velocidade_media", "distancia_total"],
        "clean": {},
    },
    {
        "csv": "goleiro_jogadores.csv",
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
        "int_cols":   ["ranking", "defesas", "acoes_dentro_area", "acoes_fora_area"],
        "float_cols": [],
        "clean": {},
    },
    {
        "csv": "movimentacao_jogadores.csv",
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
]

# ── Functions ─────────────────────────────────────────────────────────────────

def get_conn(password: str):
    return psycopg2.connect(
        host=f"db.{DB_PROJECT_REF}.supabase.co",
        port=5432, dbname="postgres", user="postgres",
        password=password, sslmode="require", connect_timeout=20,
    )


def run_ddl(cur, password: str):
    print("Criando tabelas...")
    cur.execute(DDL_TABLES)
    for table in TABLES:
        cur.execute(f"""
            ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "leitura publica" ON public.{table};
            CREATE POLICY "leitura publica" ON public.{table} FOR SELECT USING (true);
        """)
    print("Criando view stats_completos...")
    cur.execute(VIEW_DDL)
    print("DDL concluido.\n")


def upload_table(cur, cfg: dict):
    csv_path = os.path.join(CSV_DIR, cfg["csv"])
    if not os.path.exists(csv_path):
        print(f"  [AVISO] CSV não encontrado: {csv_path}")
        return

    df = pd.read_csv(csv_path, encoding="utf-8-sig", dtype=str)
    # Normaliza nomes de colunas (remove espaços extras)
    df.columns = [c.strip() for c in df.columns]

    # Aplica limpezas específicas antes do rename
    for csv_col, fn in cfg.get("clean", {}).items():
        mapped = cfg["col_map"].get(csv_col, csv_col)
        if csv_col in df.columns:
            df[csv_col] = df[csv_col].apply(fn)

    # Renomeia apenas colunas que existem
    existing_map = {k: v for k, v in cfg["col_map"].items() if k in df.columns}
    df = df.rename(columns=existing_map)
    db_cols = list(cfg["col_map"].values())
    df = df[[c for c in db_cols if c in df.columns]]

    # Converte tipos
    for col in cfg["int_cols"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)
    for col in cfg["float_cols"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(float)

    # Filtra linhas com nome/pais vazios
    df = df[df["nome"].str.strip().astype(bool) & df["pais"].str.strip().astype(bool)]

    records = df.to_dict(orient="records")
    cols = [c for c in db_cols if c in df.columns]
    placeholders = ", ".join(["%s"] * len(cols))
    col_names    = ", ".join(cols)
    update_set   = ", ".join(
        f"{c} = EXCLUDED.{c}" for c in cols if c not in ("nome", "pais")
    )
    sql = f"""
        INSERT INTO public.{cfg["table"]} ({col_names})
        VALUES ({placeholders})
        ON CONFLICT (nome, pais) DO UPDATE SET
            {update_set},
            updated_at = now()
    """
    cur.executemany(sql, [tuple(r.get(c) for c in cols) for r in records])
    print(f"  OK {cfg['table']}: {len(records)} registros.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db-password", default=os.environ.get("SUPABASE_DB_PASSWORD", ""))
    args = parser.parse_args()

    if not args.db_password:
        print("Erro: informe --db-password ou defina SUPABASE_DB_PASSWORD")
        sys.exit(1)

    print(f"Conectando ao Supabase ({DB_PROJECT_REF})...")
    conn = get_conn(args.db_password)
    conn.autocommit = True

    with conn.cursor() as cur:
        run_ddl(cur, args.db_password)
        print("Fazendo upload dos dados...\n")
        for cfg in UPLOADS:
            print(f"  > {cfg['csv']}")
            upload_table(cur, cfg)

    conn.close()
    print("\nEtapa 4 concluida!")


if __name__ == "__main__":
    main()
