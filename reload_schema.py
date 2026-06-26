import psycopg2
conn = psycopg2.connect(
    host="db.eeynngvwhhpvkitcecjx.supabase.co",
    port=5432, dbname="postgres", user="postgres",
    password="SUPABASE_DB_PASSWORD_REDACTED", sslmode="require"
)
conn.autocommit = True
cur = conn.cursor()
cur.execute("NOTIFY pgrst, 'reload schema';")
print("Schema reload notificado.")
cur.close()
conn.close()
