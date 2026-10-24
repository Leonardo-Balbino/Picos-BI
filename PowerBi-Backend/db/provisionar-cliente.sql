-- Provisiona o cliente POWERBI (produto interno "PICOS Analytics" — ver nota de
-- nomenclatura em MIGRACAO.md) no Postgres central compartilhado (VPS consolidada
-- multi-cliente, mesmo padrão do Picos-gestao-back). Roda UMA VEZ contra o Postgres
-- central, autenticado como um superusuário (ex.: "postgres") — nunca contra o
-- Postgres de dev local, onde o dono já é o usuário "postgres" default da imagem
-- oficial (ver docker-compose.yml), sem essa separação de privilégio.
--
-- Uso:
--   psql "postgresql://postgres:<senha-do-superusuario>@postgres-central:5432/postgres" \
--     -v senha_powerbi_app="$POWERBI_APP_DB_PASSWORD" \
--     -v limite_conexoes=20 \
--     -f db/provisionar-cliente.sql
--
-- A senha nunca fica literal neste arquivo — vem de `-v` (variável do psql),
-- populada por variável de ambiente/gerenciador de segredos no momento de rodar,
-- nunca commitada. `limite_conexoes`: ajustar pelo pool real do Prisma nesta app
-- mais alguma folga — nunca deixar sem limite (`-1`) num Postgres compartilhado
-- por vários clientes.
--
-- Idempotente: pode rodar de novo com segurança (ex.: pra rotacionar senha — ALTER
-- ROLE sobrescreve sem erro; CREATE ROLE/DATABASE só roda se ainda não existir, via
-- \gexec, porque nenhum dos dois pode ficar dentro de um DO $$ ... $$ — não rodam
-- em bloco de transação).
--
-- Nomes fixos (não parametrizados): banco "picos_analytics" (mesmo nome já usado em
-- dev, ver docker-compose.yml e .env.example — trocar o nome do banco agora
-- quebraria referência com o histórico do projeto sem ganho nenhum), role
-- "powerbi_app" (nome de infra — ver MIGRACAO.md sobre a mistura de nomes deste
-- cliente: pasta "PowerBi-Backend", produto "PICOS Analytics", rede "net_powerbi").

\set ON_ERROR_STOP on

-- -----------------------------------------------------------------------
-- 1. Role da aplicação — sem SUPERUSER, sem CREATEDB, sem CREATEROLE (são o
--    default do CREATE ROLE quando não pedidos; ficam de fora daqui de
--    propósito, nunca concedidos). LOGIN porque é quem a app usa pra
--    conectar via DATABASE_URL.
-- -----------------------------------------------------------------------
SELECT 'CREATE ROLE powerbi_app LOGIN PASSWORD ' || quote_literal(:'senha_powerbi_app')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'powerbi_app')
\gexec

-- Roda sempre, exista a role de antes ou tenha acabado de ser criada acima:
-- garante a senha atual (rotação) e reafirma os privilégios negados — nunca
-- assume que uma alteração manual anterior não promoveu a role por engano.
ALTER ROLE powerbi_app WITH LOGIN PASSWORD :'senha_powerbi_app' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER ROLE powerbi_app CONNECTION LIMIT :limite_conexoes;

-- -----------------------------------------------------------------------
-- 2. Banco dedicado — um banco por cliente (não um schema dentro de um
--    banco compartilhado): isolamento por CONNECT, não só por search_path.
--    Dono é a própria role da app.
-- -----------------------------------------------------------------------
SELECT 'CREATE DATABASE picos_analytics OWNER powerbi_app ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'picos_analytics')
\gexec

-- Realinha o dono caso o banco já existisse de uma convenção anterior.
ALTER DATABASE picos_analytics OWNER TO powerbi_app;

-- Só a própria role da app conecta neste banco.
REVOKE CONNECT ON DATABASE picos_analytics FROM PUBLIC;
GRANT CONNECT ON DATABASE picos_analytics TO powerbi_app;

-- -----------------------------------------------------------------------
-- 3. Schema "public" dentro do banco do cliente — a partir daqui os
--    comandos rodam DENTRO de picos_analytics (\connect troca a sessão do
--    psql).
-- -----------------------------------------------------------------------
\connect picos_analytics

ALTER SCHEMA public OWNER TO powerbi_app;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO powerbi_app;

-- -----------------------------------------------------------------------
-- 4. Defesa em profundidade: falha alto se, por qualquer motivo (alteração
--    manual futura, script rodado fora de ordem), a role tiver privilégio
--    elevado demais. Não deveria disparar nunca — é um alarme, não o
--    mecanismo principal de restrição.
-- -----------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname = 'powerbi_app'
      AND (rolsuper OR rolcreatedb OR rolcreaterole)
  ) THEN
    RAISE EXCEPTION
      'powerbi_app tem privilégio elevado demais (superuser/createdb/createrole) — provisionamento abortado.';
  END IF;
END
$$;
