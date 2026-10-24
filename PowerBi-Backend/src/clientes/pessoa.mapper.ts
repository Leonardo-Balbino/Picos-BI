import { flagAtivo } from '../upstream/erp.constants'

export interface PessoaRaw {
  codigo?: unknown
  razaoSocial?: unknown
  fantasia?: unknown
  tipo?: unknown
  cnpjCpf?: unknown
  dataCadastro?: unknown
  ativo?: unknown
  contato?: { fone?: unknown; celular?: unknown; email?: unknown }
  enderecoPrincipal?: { uf?: unknown }
}

export interface PessoaMapeada {
  codigo: string
  razaoSocial: string
  fantasia: string
  tipo: string
  cnpjCpf: string
  dataCadastro: string
  ativo: boolean
  contatoFone: string | null
  contatoCelular: string | null
  contatoEmail: string | null
  uf: string | null
}

function stringOuNulo(valor: unknown): string | null {
  return valor === undefined || valor === null ? null : String(valor)
}

/** Só a UF vem legível (`enderecoPrincipal.uf`); o município só existe como `idIbgeMunicipio`
 * numérico, sem lookup disponível na API — por isso não é sincronizado. */
export function mapPessoa(raw: PessoaRaw): PessoaMapeada {
  return {
    codigo: String(raw.codigo ?? ''),
    razaoSocial: String(raw.razaoSocial ?? ''),
    fantasia: String(raw.fantasia ?? raw.razaoSocial ?? ''),
    tipo: String(raw.tipo ?? ''),
    cnpjCpf: String(raw.cnpjCpf ?? ''),
    dataCadastro: String(raw.dataCadastro ?? ''),
    ativo: flagAtivo(raw.ativo),
    contatoFone: stringOuNulo(raw.contato?.fone),
    contatoCelular: stringOuNulo(raw.contato?.celular),
    contatoEmail: stringOuNulo(raw.contato?.email),
    uf: stringOuNulo(raw.enderecoPrincipal?.uf),
  }
}
