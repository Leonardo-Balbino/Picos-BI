/**
 * Uma função por endpoint da API. Cada wrapper fixa a casing correta dos parâmetros de
 * data (seção 9 do prompt de edição v2 — `DataInicio/DataFim` vs `inicio/fim` vs
 * `dataInicio/dataFim` variam de endpoint para endpoint) e faz o parse campo-a-campo do
 * payload bruto para os tipos internos de `types/index.ts`, para as páginas nunca
 * precisarem conhecer o shape cru da API.
 */
import { apiGet, fetchAllPages } from './api'
import { flagAtivo, MODELOS_VENDA } from './apiConstants'
import type {
  Venda,
  ItemVendido,
  Produto,
  LocalEstoque,
  SaldoEstoque,
  FormaPagamentoDim,
  Pessoa,
  Empresa,
  ContaPendente,
  Comissao,
  Dre,
} from '@/types'

function mapVenda(raw: any): Venda {
  return {
    codigo: String(raw.codigo ?? ''),
    numero: String(raw.numero ?? ''),
    serie: String(raw.serie ?? ''),
    modelo: String(raw.modelo ?? ''),
    modeloDescricao: String(raw.modeloDescricao ?? raw.modelo ?? ''),
    dataHora: String(raw.dataHora ?? raw.dataHoraMovimento ?? ''),
    dataHoraMovimento: String(raw.dataHoraMovimento ?? raw.dataHora ?? ''),
    idCaixa: String(raw.idCaixa ?? ''),
    valTotal: raw.valTotal === null || raw.valTotal === undefined ? null : Number(raw.valTotal),
    tipoMovimento: String(raw.tipoMovimento ?? ''),
    tipoMovimentoDescricao: String(raw.tipoMovimentoDescricao ?? ''),
    tipoMovimentoFinanceiro: String(raw.tipoMovimentoFinanceiro ?? ''),
    status: String(raw.status ?? ''),
    statusDescricao: String(raw.statusDescricao ?? ''),
    nomeUsuario: String(raw.nomeUsuario ?? ''),
    pagamentos: Array.isArray(raw.pagamentosLista)
      ? raw.pagamentosLista
          .map((p: any) => p?.documentoPagamento)
          .filter((dp: unknown) => Boolean(dp))
          .map((dp: any) => ({
            idPagamento: String(dp.idPagamento ?? ''),
            descricao: String(dp.descricao ?? ''),
            valor: Number(dp.valor ?? 0),
          }))
      : [],
  }
}

/** `documento/v1` — payload pesado; `mapVenda` descarta tudo que não usamos (mercadoriasLista, transporte, pessoa...). */
export function getVendasPeriodo(
  dataInicio: string,
  dataFim: string,
  onProgress?: (pagina: number, totalPaginas: number) => void,
  signal?: AbortSignal,
): Promise<Venda[]> {
  return fetchAllPages<Venda>(
    '/documento/v1',
    { DataInicio: dataInicio, DataFim: dataFim, limit: 100 },
    mapVenda,
    onProgress,
    signal,
  )
}

function mapItemVendido(raw: any): ItemVendido {
  return {
    idMercadoriaVariacao: String(raw.idMercadoriaVariacao ?? ''),
    descricao: String(raw.descricao ?? ''),
    qtd: Number(raw.qtd ?? 0),
    valTotalLiquido: Number(raw.valTotalLiquido ?? 0),
  }
}

/**
 * `Modelo` é obrigatório nesse endpoint (400 "modelo deve ser informado" sem ele) e só aceita
 * um valor por chamada — repetir o parâmetro na mesma URL é ignorado pelo servidor (fica só
 * com o primeiro). Por isso buscamos uma vez por modelo de venda (`MODELOS_VENDA` — 65/NFC-e
 * e PA/Pedido de Venda, os únicos com `tipoMovimentoFinanceiro:'R'` confirmado) e somamos por
 * `idMercadoriaVariacao`, senão o Top Produtos ficaria menor que o Total de Vendas do KPI.
 */
export async function getItensVendidosPeriodo(
  dataInicio: string,
  dataFim: string,
  signal?: AbortSignal,
): Promise<ItemVendido[]> {
  const porModelo = await Promise.all(
    MODELOS_VENDA.map((modelo) =>
      fetchAllPages<ItemVendido>(
        '/documento/mercadorias-vendidas/v1',
        { DataInicio: dataInicio, DataFim: dataFim, Modelo: modelo, limit: 100 },
        mapItemVendido,
        undefined,
        signal,
      ),
    ),
  )
  const somaPorItem = new Map<string, ItemVendido>()
  for (const item of porModelo.flat()) {
    const atual = somaPorItem.get(item.idMercadoriaVariacao)
    if (atual) {
      atual.qtd += item.qtd
      atual.valTotalLiquido += item.valTotalLiquido
    } else {
      somaPorItem.set(item.idMercadoriaVariacao, { ...item })
    }
  }
  return Array.from(somaPorItem.values())
}

function mapProduto(raw: any): Produto {
  return {
    codigoMercadoriaVariacao: String(raw.codigoMercadoriaVariacao ?? ''),
    descricao: String(raw.descricao ?? ''),
    codigoBarras: String(raw.codigoBarras ?? ''),
    referenciaMercadoria: String(raw.referenciaMercadoria ?? ''),
    embalagem: String(raw.embalagem ?? ''),
    idMarca: String(raw.idMarca ?? ''),
    qtdEstoqueMinimo: Number(raw.qtdEstoqueMinimo ?? 0),
    qtdEstoqueMaximo: Number(raw.qtdEstoqueMaximo ?? 0),
    ativo: flagAtivo(raw.ativo),
  }
}

export function getCatalogoProdutos(): Promise<Produto[]> {
  return fetchAllPages<Produto>('/mercadoria/v1', { limit: 100 }, mapProduto)
}

function mapLocalEstoque(raw: any): LocalEstoque {
  return {
    codigo: String(raw.codigo ?? ''),
    descricao: String(raw.descricao ?? ''),
    ativo: flagAtivo(raw.ativo),
  }
}

export function getLocaisEstoque(): Promise<LocalEstoque[]> {
  return fetchAllPages<LocalEstoque>('/local-estoque/v1', { limit: 100 }, mapLocalEstoque)
}

/** Schema confirmado por inspeção real (seção 14.1 resolvida) — mantém a validação como rede de segurança se a API mudar. */
function mapSaldoEstoque(raw: any): SaldoEstoque {
  if (typeof raw?.qtdSaldo !== 'number' || !raw?.idMercadoriaVariacao) {
    throw new Error('Schema divergente em local-estoque/{id}/estoques/v1')
  }
  return {
    idMercadoriaVariacao: String(raw.idMercadoriaVariacao),
    qtdSaldo: Number(raw.qtdSaldo),
    qtdSaldoReserva: Number(raw.qtdSaldoReserva ?? 0),
    dataHora: String(raw.dataHora ?? ''),
  }
}

export function getSaldoEstoqueLocal(idLocal: string): Promise<SaldoEstoque[]> {
  return fetchAllPages<SaldoEstoque>(`/local-estoque/${idLocal}/estoques/v1`, { limit: 100 }, mapSaldoEstoque)
}

function mapFormaPagamentoDim(raw: any): FormaPagamentoDim {
  return {
    codigo: String(raw.codigo ?? ''),
    descricao: String(raw.descricao ?? ''),
    idTipo: String(raw.idTipo ?? ''),
    tipoDescricao: String(raw.tipoDescricao ?? ''),
    aVista: flagAtivo(raw.aVista),
    ativo: flagAtivo(raw.ativo),
  }
}

export function getFormasPagamento(): Promise<FormaPagamentoDim[]> {
  return fetchAllPages<FormaPagamentoDim>('/pagamento/v1', { limit: 100 }, mapFormaPagamentoDim)
}

function mapPessoa(raw: any): Pessoa {
  return {
    codigo: String(raw.codigo ?? ''),
    razaoSocial: String(raw.razaoSocial ?? ''),
    fantasia: String(raw.fantasia ?? raw.razaoSocial ?? ''),
    tipo: String(raw.tipo ?? ''),
    cnpjCpf: String(raw.cnpjCpf ?? ''),
    dataCadastro: String(raw.dataCadastro ?? ''),
    ativo: flagAtivo(raw.ativo),
    contato: {
      fone: raw.contato?.fone,
      celular: raw.contato?.celular,
      email: raw.contato?.email,
    },
    uf: raw.enderecoPrincipal?.uf,
  }
}

export function getPessoas(onProgress?: (pagina: number, totalPaginas: number) => void): Promise<Pessoa[]> {
  return fetchAllPages<Pessoa>('/pessoa/v1', { limit: 100 }, mapPessoa, onProgress)
}

export async function getEmpresa(): Promise<Empresa> {
  const raw = await apiGet<any>('/empresa/v1')
  return {
    fantasia: String(raw.fantasia ?? raw.razaoSocial ?? ''),
    razaoSocial: String(raw.razaoSocial ?? ''),
    cnpjCpf: String(raw.cnpjCpf ?? ''),
    municipio: String(raw.municipio ?? ''),
    uf: String(raw.uf ?? ''),
    logo: raw.logo,
  }
}

function mapContaPendente(raw: any): ContaPendente {
  return {
    idDocumento: String(raw.idDocumento ?? ''),
    numero: String(raw.numero ?? ''),
    nome: String(raw.nome ?? ''),
    descricao: String(raw.descricao ?? ''),
    dtLancamento: String(raw.dtLancamento ?? ''),
    dtVencimento: String(raw.dtVencimento ?? ''),
    dtPagamento: raw.dtPagamento ?? null,
    valOrigem: Number(raw.valOrigem ?? 0),
    valPago: Number(raw.valPago ?? 0),
    valDesconto: Number(raw.valDesconto ?? 0),
    valSaldo: Number(raw.valSaldo ?? 0),
    status: String(raw.status ?? ''),
  }
}

/** Atenção: `inicio`/`fim` em minúsculo — casing diferente de `documento/v1`. */
export function getContasReceberPendentes(inicio: string, fim: string, signal?: AbortSignal): Promise<ContaPendente[]> {
  return fetchAllPages<ContaPendente>(
    '/conta-receber/pendentes/v1',
    { inicio, fim, limit: 100 },
    mapContaPendente,
    undefined,
    signal,
  )
}

export function getContasPagarPendentes(inicio: string, fim: string, signal?: AbortSignal): Promise<ContaPendente[]> {
  return fetchAllPages<ContaPendente>(
    '/conta-pagar/pendentes/v1',
    { inicio, fim, limit: 100 },
    mapContaPendente,
    undefined,
    signal,
  )
}

function mapComissao(raw: any): Comissao {
  return {
    nomeFuncionario: String(raw.nomeFuncionario ?? ''),
    valTotalLiquido: Number(raw.valTotalLiquido ?? 0),
    valTotalComissao: Number(raw.valTotalComissao ?? 0),
  }
}

/** Atenção: `dataInicio`/`dataFim` em camelCase — casing diferente de `documento/v1`. */
export function getComissoes(dataInicio: string, dataFim: string, signal?: AbortSignal): Promise<Comissao[]> {
  return fetchAllPages<Comissao>(
    '/funcionario/comissoes/v1',
    { dataInicio, dataFim, limit: 100 },
    mapComissao,
    undefined,
    signal,
  )
}

export async function getDre(dataInicio: string, dataFim: string): Promise<Dre> {
  const raw = await apiGet<any>('/dre/v1', { DataInicio: dataInicio, DataFim: dataFim })
  return {
    periodos: Array.isArray(raw.periodos) ? raw.periodos : [],
    linhas: Array.isArray(raw.linhas)
      ? raw.linhas.map((l: any) => ({
          descricao: String(l.descricao ?? ''),
          principal: Boolean(l.principal),
          classificacao: String(l.classificacao ?? ''),
          periodos: Array.isArray(l.periodos)
            ? l.periodos.map((p: any) => ({
                indice: Number(p.indice ?? 0),
                valor: Number(p.valor ?? 0),
                porcentagem: Number(p.porcentagem ?? 0),
              }))
            : [],
        }))
      : [],
  }
}
