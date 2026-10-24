-- AlterTable
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "idSecao" TEXT;
ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "nomeSecao" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Produto_idLoja_idSecao_idx" ON "Produto"("idLoja", "idSecao");
