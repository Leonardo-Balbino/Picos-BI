import { flagAtivo } from '../upstream/erp.constants'

export interface ProdutoRaw {
  codigoMercadoriaVariacao?: unknown
  descricao?: unknown
  codigoBarras?: unknown
  referenciaMercadoria?: unknown
  embalagem?: unknown
  idMarca?: unknown
  idSecao?: unknown
  nomeSecao?: unknown
  qtdEstoqueMinimo?: unknown
  qtdEstoqueMaximo?: unknown
  ativo?: unknown
}

export interface ProdutoMapeado {
  codigoMercadoriaVariacao: string
  descricao: string
  codigoBarras: string
  referenciaMercadoria: string
  embalagem: string
  idMarca: string
  idSecao: string | null
  nomeSecao: string | null
  qtdEstoqueMinimo: number
  qtdEstoqueMaximo: number
  ativo: boolean
}

export function mapProduto(raw: ProdutoRaw, secoesMap?: Map<string, string>): ProdutoMapeado {
  const idSecao = raw.idSecao ? String(raw.idSecao) : null
  const nomeSecao =
    (idSecao && secoesMap?.get(idSecao)) ||
    (idSecao === '1' ? 'Produtos' : idSecao === '2' ? 'Insumos' : idSecao ? `Seção ${idSecao}` : 'Geral')

  return {
    codigoMercadoriaVariacao: String(raw.codigoMercadoriaVariacao ?? ''),
    descricao: String(raw.descricao ?? ''),
    codigoBarras: String(raw.codigoBarras ?? ''),
    referenciaMercadoria: String(raw.referenciaMercadoria ?? ''),
    embalagem: String(raw.embalagem ?? ''),
    idMarca: String(raw.idMarca ?? ''),
    idSecao,
    nomeSecao,
    qtdEstoqueMinimo: Number(raw.qtdEstoqueMinimo ?? 0),
    qtdEstoqueMaximo: Number(raw.qtdEstoqueMaximo ?? 0),
    ativo: flagAtivo(raw.ativo),
  }
}
