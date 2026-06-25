"""
Setup do banco de dados Supabase para o projeto Copa 2026.
Uso:
    python supabase_setup.py --db-password SUA_SENHA
    ou via variavel de ambiente:
    $env:SUPABASE_DB_PASSWORD = "SUA_SENHA" ; python supabase_setup.py
"""
import argparse
import os
import sys
import psycopg2

PROJECT_REF  = "eeynngvwhhpvkitcecjx"
DB_HOST      = f"db.{PROJECT_REF}.supabase.co"
DB_PORT      = 5432
DB_NAME      = "postgres"
DB_USER      = "postgres"

DDL_STATEMENTS = [
    # Tabela principal
    """
    CREATE TABLE IF NOT EXISTS public.disciplina_jogadores (
        id                          BIGSERIAL PRIMARY KEY,
        ranking                     INTEGER,
        nome                        TEXT        NOT NULL,
        pais                        CHAR(3)     NOT NULL,
        posicao_campo               TEXT        NOT NULL
            CHECK (posicao_campo IN ('FW','MF','DF','GK')),
        faltas_cometidas            INTEGER     NOT NULL DEFAULT 0,
        faltas_sofridas             INTEGER     NOT NULL DEFAULT 0,
        cartoes_amarelos            INTEGER     NOT NULL DEFAULT 0,
        cartoes_vermelhos           INTEGER     NOT NULL DEFAULT 0,
        cartoes_vermelhos_indiretos INTEGER     NOT NULL DEFAULT 0,
        impedimentos                INTEGER     NOT NULL DEFAULT 0,
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_jogador_pais UNIQUE (nome, pais)
    )
    """,

    # Índices
    "CREATE INDEX IF NOT EXISTS idx_disc_pais       ON public.disciplina_jogadores (pais)",
    "CREATE INDEX IF NOT EXISTS idx_disc_posicao    ON public.disciplina_jogadores (posicao_campo)",
    "CREATE INDEX IF NOT EXISTS idx_disc_updated    ON public.disciplina_jogadores (updated_at DESC)",

    # RLS
    "ALTER TABLE public.disciplina_jogadores ENABLE ROW LEVEL SECURITY",

    # Política de leitura pública (idempotente via DO block)
    """
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'disciplina_jogadores'
          AND policyname = 'leitura_publica'
      ) THEN
        EXECUTE 'CREATE POLICY leitura_publica
                 ON public.disciplina_jogadores
                 FOR SELECT USING (true)';
      END IF;
    END $$
    """,

    # View por Time
    """
    CREATE OR REPLACE VIEW public.disciplina_por_time AS
    SELECT
        pais,
        COUNT(*)                            AS total_jogadores,
        SUM(faltas_cometidas)               AS total_faltas_cometidas,
        SUM(faltas_sofridas)                AS total_faltas_sofridas,
        SUM(cartoes_amarelos)               AS total_cartoes_amarelos,
        SUM(cartoes_vermelhos)              AS total_cartoes_vermelhos,
        SUM(cartoes_vermelhos_indiretos)    AS total_cartoes_vermelhos_indiretos,
        SUM(impedimentos)                   AS total_impedimentos,
        ROUND(AVG(faltas_cometidas), 2)     AS media_faltas_cometidas,
        ROUND(AVG(cartoes_amarelos), 2)     AS media_cartoes_amarelos
    FROM public.disciplina_jogadores
    GROUP BY pais
    ORDER BY total_faltas_cometidas DESC
    """,

    # View por Posição
    """
    CREATE OR REPLACE VIEW public.disciplina_por_posicao AS
    SELECT
        posicao_campo,
        COUNT(*)                            AS total_jogadores,
        SUM(faltas_cometidas)               AS total_faltas_cometidas,
        SUM(faltas_sofridas)                AS total_faltas_sofridas,
        SUM(cartoes_amarelos)               AS total_cartoes_amarelos,
        SUM(cartoes_vermelhos)              AS total_cartoes_vermelhos,
        SUM(cartoes_vermelhos_indiretos)    AS total_cartoes_vermelhos_indiretos,
        SUM(impedimentos)                   AS total_impedimentos,
        ROUND(AVG(faltas_cometidas), 2)     AS media_faltas_cometidas,
        ROUND(AVG(cartoes_amarelos), 2)     AS media_cartoes_amarelos
    FROM public.disciplina_jogadores
    GROUP BY posicao_campo
    ORDER BY total_faltas_cometidas DESC
    """,
]


def connect(password: str) -> psycopg2.extensions.connection:
    print(f"\nConectando a {DB_HOST}:{DB_PORT} como {DB_USER}...")
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=password,
        sslmode="require",
        connect_timeout=15,
    )
    conn.autocommit = True
    print("  Conexao estabelecida com sucesso!")
    return conn


def run_ddl(conn: psycopg2.extensions.connection) -> None:
    print("\nExecutando DDL...")
    with conn.cursor() as cur:
        for stmt in DDL_STATEMENTS:
            label = " ".join(stmt.split())[:70]
            try:
                cur.execute(stmt)
                print(f"  OK: {label}")
            except Exception as e:
                print(f"  ERRO: {label}\n       {e}")


def verify(conn: psycopg2.extensions.connection) -> bool:
    print("\nVerificando objetos criados...")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT table_name, table_type
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name IN (
                  'disciplina_jogadores',
                  'disciplina_por_time',
                  'disciplina_por_posicao'
              )
            ORDER BY table_name
        """)
        rows = cur.fetchall()
        for name, t in rows:
            print(f"  OK: {name}  ({t})")

        # Teste da view
        cur.execute("SELECT * FROM public.disciplina_por_time LIMIT 5")
        sample = cur.fetchall()
        if sample:
            print(f"\n  Amostra disciplina_por_time (top 5):")
            for row in sample:
                print(f"    {row}")
        else:
            print("  (tabela vazia — rode o scraper para popular)")

        return len(rows) == 3


def main():
    parser = argparse.ArgumentParser(description="Setup do banco Supabase - Copa 2026")
    parser.add_argument(
        "--db-password",
        default=os.environ.get("SUPABASE_DB_PASSWORD", ""),
        help="Senha do banco PostgreSQL do Supabase (Settings > Database)",
    )
    args = parser.parse_args()

    password = args.db_password
    if not password:
        print("ERRO: senha do banco nao fornecida.")
        print("  Use: python supabase_setup.py --db-password SUA_SENHA")
        print("  Ou:  $env:SUPABASE_DB_PASSWORD='SUA_SENHA' ; python supabase_setup.py")
        print("\nOnde encontrar a senha:")
        print("  Supabase Dashboard -> Settings -> Database -> 'Database password'")
        print("  (Se esqueceu, clique em 'Reset database password')")
        sys.exit(1)

    conn = connect(password)
    run_ddl(conn)
    ok = verify(conn)
    conn.close()

    if ok:
        print("\nSetup concluido! Banco pronto para o scraper.")
    else:
        print("\nSetup incompleto. Verifique os erros acima.")
        sys.exit(1)


if __name__ == "__main__":
    main()
