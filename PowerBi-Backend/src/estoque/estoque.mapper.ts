import { flagAtivo } from '../upstream/erp.constants'

export interface LocalEstoqueRaw {
  codigo?: unknown
  descricao?: unknown
  ativo?: unknown
}

export interface LocalEstoqueMapeado {
  codigo: string
  descricao: string
  ativo: boolean
}

export function mapLocalEstoque(raw: LocalEstoqueRaw): LocalEstoqueMapeado {
  return {
    codigo: String(raw.codigo ?? ''),
    descricao: String(raw.descricao ?? ''),
    ativo: flagAtivo(raw.ativo),
  }
}

export interface SaldoEstoqueRaw {
  idMercadoriaVariacao?: unknown
  qtdSaldo?: unknown
  qtdSaldoReserva?: unknown
  dataHora?: unknown
}

export interface SaldoEstoqueMapeado {
  idMercadoriaVariacao: string
  qtdSaldo: number
  qtdSaldoReserva: number
  dataHora: string
}

/** Schema não documentado oficialmente pela API, validado por inspeção real (mesma cautela do
 * front, `frontend/src/services/dataService.ts`, `mapSaldoEstoque`): se `qtdSaldo` ou
 * `idMercadoriaVariacao` não vierem como esperado, falha alto em vez de gravar dado
 * inconsistente silenciosamente — quem chama decide se isola o erro por local (ver
 * `EstoqueService.sincronizarSnapshot`) ou deixa propagar. */
export function mapSaldoEstoque(raw: SaldoEstoqueRaw): SaldoEstoqueMapeado {
  if (typeof raw.qtdSaldo !== 'number' || !raw.idMercadoriaVariacao) {
    throw new Error(
      'Schema divergente em local-estoque/{id}/estoques/v1 (qtdSaldo/idMercadoriaVariacao ausentes).',
    )
  }
  return {
    idMercadoriaVariacao: String(raw.idMercadoriaVariacao),
    qtdSaldo: raw.qtdSaldo,
    qtdSaldoReserva: Number(raw.qtdSaldoReserva ?? 0),
    dataHora: String(raw.dataHora ?? ''),
  }
}
