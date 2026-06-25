"""Upload do CSV disciplina_jogadores.csv para o Supabase via psycopg2."""
import os
import pandas as pd
import psycopg2

CSV_PATH = r"D:\01 - DataSet\Data_Fifa_2026\Data_Site_Fifa\Data_Estatisticas_Players\disciplina_jogadores.csv"
DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")
PROJECT_REF = "eeynngvwhhpvkitcecjx"

df = pd.read_csv(CSV_PATH, encoding="utf-8-sig")
print(f"CSV carregado: {len(df)} linhas")
print(f"Colunas: {list(df.columns)}")

# Renomear pelo índice posicional (seguro independente de encoding dos headers)
rename = {
    df.columns[0]: "ranking",
    df.columns[1]: "nome",
    df.columns[2]: "pais",
    df.columns[3]: "posicao_campo",
    df.columns[4]: "faltas_cometidas",
    df.columns[5]: "faltas_sofridas",
    df.columns[6]: "cartoes_amarelos",
    df.columns[7]: "cartoes_vermelhos",
    df.columns[8]: "cartoes_vermelhos_indiretos",
    df.columns[9]: "impedimentos",
}
df = df.rename(columns=rename)

# Forçar tipos numéricos
int_cols = [
    "ranking", "faltas_cometidas", "faltas_sofridas",
    "cartoes_amarelos", "cartoes_vermelhos",
    "cartoes_vermelhos_indiretos", "impedimentos",
]
for col in int_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

# Filtrar posições válidas
valid_pos = {"FW", "MF", "DF", "GK"}
invalidas = df[~df["posicao_campo"].isin(valid_pos)]
if len(invalidas) > 0:
    vals = invalidas["posicao_campo"].unique().tolist()
    print(f"Posicoes invalidas encontradas ({len(invalidas)} linhas): {vals}")
    df = df[df["posicao_campo"].isin(valid_pos)].copy()

print(f"Linhas para UPSERT: {len(df)}")

# Conectar ao Supabase
conn = psycopg2.connect(
    host=f"db.{PROJECT_REF}.supabase.co",
    port=5432,
    dbname="postgres",
    user="postgres",
    password=DB_PASSWORD,
    sslmode="require",
    connect_timeout=15,
)
conn.autocommit = True
print("Conexao estabelecida.")

SQL = """
    INSERT INTO public.disciplina_jogadores
        (ranking, nome, pais, posicao_campo,
         faltas_cometidas, faltas_sofridas,
         cartoes_amarelos, cartoes_vermelhos,
         cartoes_vermelhos_indiretos, impedimentos)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (nome, pais) DO UPDATE SET
        ranking                     = EXCLUDED.ranking,
        posicao_campo               = EXCLUDED.posicao_campo,
        faltas_cometidas            = EXCLUDED.faltas_cometidas,
        faltas_sofridas             = EXCLUDED.faltas_sofridas,
        cartoes_amarelos            = EXCLUDED.cartoes_amarelos,
        cartoes_vermelhos           = EXCLUDED.cartoes_vermelhos,
        cartoes_vermelhos_indiretos = EXCLUDED.cartoes_vermelhos_indiretos,
        impedimentos                = EXCLUDED.impedimentos,
        updated_at                  = now()
"""

cols = [
    "ranking", "nome", "pais", "posicao_campo",
    "faltas_cometidas", "faltas_sofridas",
    "cartoes_amarelos", "cartoes_vermelhos",
    "cartoes_vermelhos_indiretos", "impedimentos",
]
rows = [tuple(r[c] for c in cols) for r in df.to_dict(orient="records")]

with conn.cursor() as cur:
    cur.executemany(SQL, rows)
print(f"UPSERT concluido: {len(rows)} registros inseridos/atualizados.")

# Verificação
with conn.cursor() as cur:
    cur.execute("SELECT COUNT(*) FROM public.disciplina_jogadores")
    total = cur.fetchone()[0]
    print(f"Total na tabela: {total} registros")

    print("\nTop 5 - disciplina_por_time:")
    cur.execute("SELECT * FROM public.disciplina_por_time LIMIT 5")
    for row in cur.fetchall():
        print(f"  {row}")

    print("\nDisciplina por posicao:")
    cur.execute("SELECT * FROM public.disciplina_por_posicao")
    for row in cur.fetchall():
        print(f"  {row}")

conn.close()
print("\nVerificacao concluida!")
