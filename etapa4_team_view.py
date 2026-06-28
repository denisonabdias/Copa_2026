#!/usr/bin/env python3
"""
Cria a view stats_completos_por_time no Supabase (agregados de todas as 8 categorias por seleção).
"""
import os
import psycopg2

DB_PROJECT_REF = "eeynngvwhhpvkitcecjx"

VIEW_DDL = """
CREATE OR REPLACE VIEW public.stats_completos_por_time AS
SELECT
    d.pais,
    COUNT(DISTINCT d.nome)::integer AS total_jogadores,
    -- Disciplina
    SUM(d.faltas_cometidas)::integer             AS total_faltas_cometidas,
    SUM(d.faltas_sofridas)::integer              AS total_faltas_sofridas,
    SUM(d.cartoes_amarelos)::integer             AS total_cartoes_amarelos,
    SUM(d.cartoes_vermelhos)::integer            AS total_cartoes_vermelhos,
    SUM(d.cartoes_vermelhos_indiretos)::integer  AS total_cartoes_vermelhos_indiretos,
    SUM(d.impedimentos)::integer                 AS total_impedimentos,
    ROUND(AVG(d.faltas_cometidas)::numeric, 2)   AS media_faltas_cometidas,
    ROUND(AVG(d.cartoes_amarelos)::numeric, 2)   AS media_cartoes_amarelos,
    -- Artilharia
    SUM(COALESCE(g.gols, 0))::integer                AS total_gols,
    SUM(COALESCE(g.assistencias, 0))::integer        AS total_assistencias_artilharia,
    -- Ataque
    SUM(COALESCE(a.finalizacoes_certas, 0))::integer AS total_finalizacoes_certas,
    SUM(COALESCE(a.finalizacoes, 0))::integer        AS total_finalizacoes,
    SUM(COALESCE(a.assistencias, 0))::integer        AS total_assistencias_ataque,
    SUM(COALESCE(a.chutes_na_area, 0))::integer      AS total_chutes_na_area,
    SUM(COALESCE(a.chutes_fora_area, 0))::integer    AS total_chutes_fora_area,
    SUM(COALESCE(a.cabeceos_a_gol, 0))::integer      AS total_cabeceos_a_gol,
    ROUND(AVG(COALESCE(a.ge, 0))::numeric, 2)        AS media_ge,
    SUM(COALESCE(a.escanteios, 0))::integer          AS total_escanteios,
    -- Defesa
    SUM(COALESCE(def.perdas_bola_forcadas, 0))::integer       AS total_perdas_bola_forcadas,
    SUM(COALESCE(def.pressoes_defensivas, 0))::integer        AS total_pressoes_defensivas,
    SUM(COALESCE(def.pressoes_defensivas_diretas, 0))::integer AS total_pressoes_defensivas_diretas,
    SUM(COALESCE(def.gols_contra, 0))::integer                AS total_gols_contra,
    -- Distribuicao
    SUM(COALESCE(dist.passes, 0))::integer                       AS total_passes,
    ROUND(AVG(COALESCE(dist.precisao_passes_pct, 0))::numeric, 2) AS media_precisao_passes_pct,
    SUM(COALESCE(dist.cruzamentos, 0))::integer                  AS total_cruzamentos,
    SUM(COALESCE(dist.tentativas_ruptura_linha, 0))::integer     AS total_tentativas_ruptura_linha,
    SUM(COALESCE(dist.tentativas_mudanca_direcao, 0))::integer   AS total_tentativas_mudanca_direcao,
    -- Fisico
    ROUND(AVG(COALESCE(f.velocidade_media, 0))::numeric, 2)     AS media_velocidade,
    SUM(COALESCE(f.corridas_alta_velocidade, 0))::integer        AS total_corridas_alta_velocidade,
    SUM(COALESCE(f.arrancadas, 0))::integer                     AS total_arrancadas,
    ROUND(AVG(COALESCE(f.distancia_total, 0))::numeric, 2)      AS media_distancia_total,
    -- Goleiro
    SUM(COALESCE(gk.defesas, 0))::integer            AS total_defesas_goleiro,
    SUM(COALESCE(gk.acoes_dentro_area, 0))::integer  AS total_acoes_goleiro_dentro_area,
    SUM(COALESCE(gk.acoes_fora_area, 0))::integer    AS total_acoes_goleiro_fora_area,
    -- Movimentacao
    SUM(COALESCE(m.pedidos_bola, 0))::integer           AS total_pedidos_bola,
    SUM(COALESCE(m.pedidos_frente, 0))::integer         AS total_pedidos_frente,
    SUM(COALESCE(m.pedidos_entre, 0))::integer          AS total_pedidos_entre,
    SUM(COALESCE(m.recepcoes_entre_linhas, 0))::integer AS total_recepcoes_entre_linhas,
    SUM(COALESCE(m.recepcoes_sob_pressao, 0))::integer  AS total_recepcoes_sob_pressao,
    SUM(COALESCE(m.participacoes, 0))::integer          AS total_participacoes
FROM public.disciplina_jogadores d
LEFT JOIN public.gols_jogadores          g    ON g.nome    = d.nome AND g.pais    = d.pais
LEFT JOIN public.ataque_jogadores        a    ON a.nome    = d.nome AND a.pais    = d.pais
LEFT JOIN public.defesa_jogadores        def  ON def.nome  = d.nome AND def.pais  = d.pais
LEFT JOIN public.distribuicao_jogadores  dist ON dist.nome = d.nome AND dist.pais = d.pais
LEFT JOIN public.fisico_jogadores        f    ON f.nome    = d.nome AND f.pais    = d.pais
LEFT JOIN public.goleiro_jogadores       gk   ON gk.nome   = d.nome AND gk.pais   = d.pais
LEFT JOIN public.movimentacao_jogadores  m    ON m.nome    = d.nome AND m.pais    = d.pais
GROUP BY d.pais;
"""

conn = psycopg2.connect(
    host=f"db.{DB_PROJECT_REF}.supabase.co",
    port=5432, dbname="postgres", user="postgres",
    password=os.environ.get("SUPABASE_DB_PASSWORD", ""), sslmode="require", connect_timeout=20,
)
conn.autocommit = True
cur = conn.cursor()

print("Criando view stats_completos_por_time...")
cur.execute(VIEW_DDL)

print("Concedendo permissoes ao anon...")
cur.execute("GRANT SELECT ON public.stats_completos_por_time TO anon, authenticated;")

print("Recarregando schema PostgREST...")
cur.execute("NOTIFY pgrst, 'reload schema';")

cur.close()
conn.close()
print("Concluido.")
