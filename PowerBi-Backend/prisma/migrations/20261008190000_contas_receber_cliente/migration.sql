-- Expansão compatível: não remove registros nem altera as chaves existentes.
ALTER TABLE "ContaPendente"
  ADD COLUMN "idDocumentoErp" TEXT,
  ADD COLUMN "idPessoa" TEXT,
  ADD COLUMN "idSequencia" TEXT,
  ADD COLUMN "idParcela" TEXT;
CREATE INDEX "ContaPendente_idLoja_tipo_idPessoa_idx" ON "ContaPendente"("idLoja", "tipo", "idPessoa");
