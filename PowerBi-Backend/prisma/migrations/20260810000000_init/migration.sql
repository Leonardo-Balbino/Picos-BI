-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoConta" AS ENUM ('RECEBER', 'PAGAR');

-- CreateEnum
CREATE TYPE "EntidadeSync" AS ENUM ('VENDA', 'ITEM_VENDIDO', 'COMISSAO', 'PRODUTO', 'PESSOA', 'FORMA_PAGAMENTO', 'ESTOQUE', 'EMPRESA', 'CONTA_RECEBER', 'CONTA_PAGAR');

-- CreateEnum
CREATE TYPE "StatusSync" AS ENUM ('SUCESSO', 'ERRO');

-- CreateTable
CREATE TABLE "Venda" (
    "codigo" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "modeloDescricao" TEXT NOT NULL,
    "dataHora" TEXT NOT NULL,
    "dataHoraMovimento" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "idCaixa" TEXT NOT NULL,
    "valTotal" DECIMAL(14,2),
    "tipoMovimento" TEXT NOT NULL,
    "tipoMovimentoDescricao" TEXT NOT NULL,
    "tipoMovimentoFinanceiro" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusDescricao" TEXT NOT NULL,
    "nomeUsuario" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "PagamentoVenda" (
    "id" TEXT NOT NULL,
    "vendaCodigo" TEXT NOT NULL,
    "idPagamento" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PagamentoVenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemVendidoDia" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "idMercadoriaVariacao" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "qtd" DECIMAL(14,3) NOT NULL,
    "valTotalLiquido" DECIMAL(14,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemVendidoDia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComissaoDia" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "nomeFuncionario" TEXT NOT NULL,
    "valTotalLiquido" DECIMAL(14,2) NOT NULL,
    "valTotalComissao" DECIMAL(14,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComissaoDia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "codigoMercadoriaVariacao" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "codigoBarras" TEXT NOT NULL,
    "referenciaMercadoria" TEXT NOT NULL,
    "embalagem" TEXT NOT NULL,
    "idMarca" TEXT NOT NULL,
    "qtdEstoqueMinimo" DECIMAL(14,3) NOT NULL,
    "qtdEstoqueMaximo" DECIMAL(14,3) NOT NULL,
    "ativo" BOOLEAN NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("codigoMercadoriaVariacao")
);

-- CreateTable
CREATE TABLE "Pessoa" (
    "codigo" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "fantasia" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cnpjCpf" TEXT NOT NULL,
    "dataCadastro" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL,
    "contatoFone" TEXT,
    "contatoCelular" TEXT,
    "contatoEmail" TEXT,
    "uf" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pessoa_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "FormaPagamentoDim" (
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "idTipo" TEXT NOT NULL,
    "tipoDescricao" TEXT NOT NULL,
    "aVista" BOOLEAN NOT NULL,
    "ativo" BOOLEAN NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormaPagamentoDim_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "LocalEstoque" (
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalEstoque_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "SaldoEstoque" (
    "id" TEXT NOT NULL,
    "idLocal" TEXT NOT NULL,
    "idMercadoriaVariacao" TEXT NOT NULL,
    "qtdSaldo" DECIMAL(14,3) NOT NULL,
    "qtdSaldoReserva" DECIMAL(14,3) NOT NULL,
    "dataHora" TEXT NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaldoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "fantasia" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "cnpjCpf" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "logo" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaPendente" (
    "id" TEXT NOT NULL,
    "tipo" "TipoConta" NOT NULL,
    "idDocumento" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dtLancamento" DATE NOT NULL,
    "dtVencimento" DATE NOT NULL,
    "dtPagamento" DATE,
    "valOrigem" DECIMAL(14,2) NOT NULL,
    "valPago" DECIMAL(14,2) NOT NULL,
    "valDesconto" DECIMAL(14,2) NOT NULL,
    "valSaldo" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL,
    "aindaPendente" BOOLEAN NOT NULL DEFAULT true,
    "liquidadaEm" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaPendente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "entidade" "EntidadeSync" NOT NULL,
    "dataReferencia" DATE,
    "status" "StatusSync" NOT NULL,
    "registrosProcessados" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "executadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Venda_data_idx" ON "Venda"("data");

-- CreateIndex
CREATE INDEX "Venda_idCaixa_data_idx" ON "Venda"("idCaixa", "data");

-- CreateIndex
CREATE INDEX "PagamentoVenda_vendaCodigo_idx" ON "PagamentoVenda"("vendaCodigo");

-- CreateIndex
CREATE INDEX "ItemVendidoDia_data_idx" ON "ItemVendidoDia"("data");

-- CreateIndex
CREATE UNIQUE INDEX "ItemVendidoDia_data_idMercadoriaVariacao_key" ON "ItemVendidoDia"("data", "idMercadoriaVariacao");

-- CreateIndex
CREATE INDEX "ComissaoDia_data_idx" ON "ComissaoDia"("data");

-- CreateIndex
CREATE UNIQUE INDEX "ComissaoDia_data_nomeFuncionario_key" ON "ComissaoDia"("data", "nomeFuncionario");

-- CreateIndex
CREATE INDEX "Produto_descricao_idx" ON "Produto"("descricao");

-- CreateIndex
CREATE INDEX "Pessoa_razaoSocial_idx" ON "Pessoa"("razaoSocial");

-- CreateIndex
CREATE INDEX "Pessoa_cnpjCpf_idx" ON "Pessoa"("cnpjCpf");

-- CreateIndex
CREATE UNIQUE INDEX "SaldoEstoque_idLocal_idMercadoriaVariacao_key" ON "SaldoEstoque"("idLocal", "idMercadoriaVariacao");

-- CreateIndex
CREATE INDEX "ContaPendente_tipo_aindaPendente_dtVencimento_idx" ON "ContaPendente"("tipo", "aindaPendente", "dtVencimento");

-- CreateIndex
CREATE UNIQUE INDEX "ContaPendente_tipo_idDocumento_key" ON "ContaPendente"("tipo", "idDocumento");

-- CreateIndex
CREATE INDEX "SyncLog_entidade_dataReferencia_idx" ON "SyncLog"("entidade", "dataReferencia");

-- CreateIndex
CREATE INDEX "SyncLog_entidade_executadoEm_idx" ON "SyncLog"("entidade", "executadoEm");

-- AddForeignKey
ALTER TABLE "PagamentoVenda" ADD CONSTRAINT "PagamentoVenda_vendaCodigo_fkey" FOREIGN KEY ("vendaCodigo") REFERENCES "Venda"("codigo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaldoEstoque" ADD CONSTRAINT "SaldoEstoque_idLocal_fkey" FOREIGN KEY ("idLocal") REFERENCES "LocalEstoque"("codigo") ON DELETE CASCADE ON UPDATE CASCADE;

