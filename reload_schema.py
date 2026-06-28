import os
import psycopg2

db_password = os.environ.get("SUPABASE_DB_PASSWORD", "")
if not db_password:
    raise SystemExit("Erro: defina SUPABASE_DB_PASSWORD antes de executar.")

conn = psycopg2.connect(
    host="db.eeynngvwhhpvkitcecjx.supabase.co",
    port=5432, dbname="postgres", user="postgres",
    password=db_password, sslmode="require"
)
conn.autocommit = True
cur = conn.cursor()
cur.execute("NOTIFY pgrst, 'reload schema';")
print("Schema reload notificado.")
cur.close()
conn.close()
