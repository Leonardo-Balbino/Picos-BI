-- 1. CreateTable Organizacao
CREATE TABLE IF NOT EXISTS "Organizacao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "cnpj" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organizacao_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Organizacao_codigo_key" ON "Organizacao"("codigo");

-- 2. CreateTable Loja
CREATE TABLE IF NOT EXISTS "Loja" (
    "id" TEXT NOT NULL,
    "idOrganizacao" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "cnpj" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "erpToken" TEXT,
    "idEmpresaErp" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loja_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Loja_codigo_key" ON "Loja"("codigo");
CREATE INDEX IF NOT EXISTS "Loja_idOrganizacao_idx" ON "Loja"("idOrganizacao");

-- 3. CreateTable Usuario (se ainda não existir pelo init)
CREATE TABLE IF NOT EXISTS "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "perfil" TEXT NOT NULL DEFAULT 'ADMIN',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_email_key" ON "Usuario"("email");
CREATE INDEX IF NOT EXISTS "Usuario_email_idx" ON "Usuario"("email");

-- 4. CreateTable UsuarioLoja (vínculo N:N franqueado e lojas)
CREATE TABLE IF NOT EXISTS "UsuarioLoja" (
    "id" TEXT NOT NULL,
    "idUsuario" TEXT NOT NULL,
    "idLoja" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioLoja_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UsuarioLoja_idUsuario_idLoja_key" ON "UsuarioLoja"("idUsuario", "idLoja");
CREATE INDEX IF NOT EXISTS "UsuarioLoja_idUsuario_idx" ON "UsuarioLoja"("idUsuario");
CREATE INDEX IF NOT EXISTS "UsuarioLoja_idLoja_idx" ON "UsuarioLoja"("idLoja");

-- 5. Adicionar coluna idLoja nas entidades analíticas e de negócio
ALTER TABLE "Venda" ADD COLUMN IF NOT EXISTS "idLoja" TEXT;
ALTER TABLE "ItemVendidoDia" ADD COLUMN IF NOT EXISTS "idLoja" TEXT;
ALTER TABLE "ComissaoDia" ADD COLUMN IF NOT EXISTS "idLoja" TEXT;
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "idLoja" TEXT;
ALTER TABLE "Pessoa" ADD COLUMN IF NOT EXISTS "idLoja" TEXT;
ALTER TABLE "FormaPagamentoDim" ADD COLUMN IF NOT EXISTS "idLoja" TEXT;
ALTER TABLE "LocalEstoque" ADD COLUMN IF NOT EXISTS "idLoja" TEXT;
ALTER TABLE "ContaPendente" ADD COLUMN IF NOT EXISTS "idLoja" TEXT;
ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "idLoja" TEXT;

-- 6. Estratégia de correspondência explícita do histórico existente:
-- O histórico de dados existente na base foi gerado exclusivamente pelo token da franquia
-- AÇAÍ SENSES - INHUMA (CNPJ 51572389000180). Criamos a organização e a loja correspondente comprovada.
INSERT INTO "Organizacao" ("id", "nome", "codigo", "cnpj", "atualizadoEm")
VALUES ('org-acai-senses', 'Rede Açaí Senses', 'acai-senses', '51572389000180', CURRENT_TIMESTAMP)
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "Loja" ("id", "idOrganizacao", "nome", "codigo", "cnpj", "cidade", "uf", "idEmpresaErp", "atualizadoEm")
VALUES ('loja-inhuma', 'org-acai-senses', 'Açaí Senses - Inhuma', 'inhuma', '51572389000180', 'Inhuma', 'PI', 1, CURRENT_TIMESTAMP)
ON CONFLICT ("codigo") DO NOTHING;

-- Atribuir registros anteriores comprovados à loja de origem
UPDATE "Venda" SET "idLoja" = 'loja-inhuma' WHERE "idLoja" IS NULL;
UPDATE "ItemVendidoDia" SET "idLoja" = 'loja-inhuma' WHERE "idLoja" IS NULL;
UPDATE "ComissaoDia" SET "idLoja" = 'loja-inhuma' WHERE "idLoja" IS NULL;
UPDATE "Produto" SET "idLoja" = 'loja-inhuma' WHERE "idLoja" IS NULL;
UPDATE "Pessoa" SET "idLoja" = 'loja-inhuma' WHERE "idLoja" IS NULL;
UPDATE "FormaPagamentoDim" SET "idLoja" = 'loja-inhuma' WHERE "idLoja" IS NULL;
UPDATE "LocalEstoque" SET "idLoja" = 'loja-inhuma' WHERE "idLoja" IS NULL;
UPDATE "ContaPendente" SET "idLoja" = 'loja-inhuma' WHERE "idLoja" IS NULL;
UPDATE "SyncLog" SET "idLoja" = 'loja-inhuma' WHERE "idLoja" IS NULL;

-- Associar o usuário administrador existente à loja
INSERT INTO "UsuarioLoja" ("id", "idUsuario", "idLoja")
SELECT gen_random_uuid()::text, u.id, 'loja-inhuma'
FROM "Usuario" u
WHERE u.email = 'leovinicius569@gmail.com'
ON CONFLICT ("idUsuario", "idLoja") DO NOTHING;

-- 7. Constraints de chave estrangeira
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Loja_idOrganizacao_fkey') THEN
        ALTER TABLE "Loja" ADD CONSTRAINT "Loja_idOrganizacao_fkey" FOREIGN KEY ("idOrganizacao") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UsuarioLoja_idUsuario_fkey') THEN
        ALTER TABLE "UsuarioLoja" ADD CONSTRAINT "UsuarioLoja_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UsuarioLoja_idLoja_fkey') THEN
        ALTER TABLE "UsuarioLoja" ADD CONSTRAINT "UsuarioLoja_idLoja_fkey" FOREIGN KEY ("idLoja") REFERENCES "Loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Venda_idLoja_fkey') THEN
        ALTER TABLE "Venda" ADD CONSTRAINT "Venda_idLoja_fkey" FOREIGN KEY ("idLoja") REFERENCES "Loja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ItemVendidoDia_idLoja_fkey') THEN
        ALTER TABLE "ItemVendidoDia" ADD CONSTRAINT "ItemVendidoDia_idLoja_fkey" FOREIGN KEY ("idLoja") REFERENCES "Loja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ComissaoDia_idLoja_fkey') THEN
        ALTER TABLE "ComissaoDia" ADD CONSTRAINT "ComissaoDia_idLoja_fkey" FOREIGN KEY ("idLoja") REFERENCES "Loja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Produto_idLoja_fkey') THEN
        ALTER TABLE "Produto" ADD CONSTRAINT "Produto_idLoja_fkey" FOREIGN KEY ("idLoja") REFERENCES "Loja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Pessoa_idLoja_fkey') THEN
        ALTER TABLE "Pessoa" ADD CONSTRAINT "Pessoa_idLoja_fkey" FOREIGN KEY ("idLoja") REFERENCES "Loja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FormaPagamentoDim_idLoja_fkey') THEN
        ALTER TABLE "FormaPagamentoDim" ADD CONSTRAINT "FormaPagamentoDim_idLoja_fkey" FOREIGN KEY ("idLoja") REFERENCES "Loja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LocalEstoque_idLoja_fkey') THEN
        ALTER TABLE "LocalEstoque" ADD CONSTRAINT "LocalEstoque_idLoja_fkey" FOREIGN KEY ("idLoja") REFERENCES "Loja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContaPendente_idLoja_fkey') THEN
        ALTER TABLE "ContaPendente" ADD CONSTRAINT "ContaPendente_idLoja_fkey" FOREIGN KEY ("idLoja") REFERENCES "Loja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SyncLog_idLoja_fkey') THEN
        ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_idLoja_fkey" FOREIGN KEY ("idLoja") REFERENCES "Loja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 8. Atualização de constraints únicas para suporte multiloja
ALTER TABLE "ItemVendidoDia" DROP CONSTRAINT IF EXISTS "ItemVendidoDia_data_idMercadoriaVariacao_key";
DROP INDEX IF EXISTS "ItemVendidoDia_data_idMercadoriaVariacao_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ItemVendidoDia_idLoja_data_idMercadoriaVariacao_key" ON "ItemVendidoDia"("idLoja", "data", "idMercadoriaVariacao");

ALTER TABLE "ComissaoDia" DROP CONSTRAINT IF EXISTS "ComissaoDia_data_nomeFuncionario_key";
DROP INDEX IF EXISTS "ComissaoDia_data_nomeFuncionario_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ComissaoDia_idLoja_data_nomeFuncionario_key" ON "ComissaoDia"("idLoja", "data", "nomeFuncionario");

-- 9. Índices de consulta compostos
CREATE INDEX IF NOT EXISTS "Venda_idLoja_data_idx" ON "Venda"("idLoja", "data");
CREATE INDEX IF NOT EXISTS "Venda_idLoja_idCaixa_data_idx" ON "Venda"("idLoja", "idCaixa", "data");
CREATE INDEX IF NOT EXISTS "ItemVendidoDia_idLoja_data_idx" ON "ItemVendidoDia"("idLoja", "data");
CREATE INDEX IF NOT EXISTS "ComissaoDia_idLoja_data_idx" ON "ComissaoDia"("idLoja", "data");
CREATE INDEX IF NOT EXISTS "Produto_idLoja_descricao_idx" ON "Produto"("idLoja", "descricao");
CREATE INDEX IF NOT EXISTS "Pessoa_idLoja_razaoSocial_idx" ON "Pessoa"("idLoja", "razaoSocial");
CREATE INDEX IF NOT EXISTS "FormaPagamentoDim_idLoja_idx" ON "FormaPagamentoDim"("idLoja");
CREATE INDEX IF NOT EXISTS "LocalEstoque_idLoja_idx" ON "LocalEstoque"("idLoja");
CREATE INDEX IF NOT EXISTS "ContaPendente_idLoja_tipo_aindaPendente_dtVencimento_idx" ON "ContaPendente"("idLoja", "tipo", "aindaPendente", "dtVencimento");
CREATE INDEX IF NOT EXISTS "SyncLog_idLoja_entidade_dataReferencia_idx" ON "SyncLog"("idLoja", "entidade", "dataReferencia");
CREATE INDEX IF NOT EXISTS "SyncLog_idLoja_entidade_executadoEm_idx" ON "SyncLog"("idLoja", "entidade", "executadoEm");
