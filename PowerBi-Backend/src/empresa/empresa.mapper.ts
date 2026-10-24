export interface EmpresaRaw {
  fantasia?: unknown
  razaoSocial?: unknown
  cnpjCpf?: unknown
  municipio?: unknown
  uf?: unknown
  logo?: unknown
}

export interface EmpresaMapeada {
  fantasia: string
  razaoSocial: string
  cnpjCpf: string
  municipio: string
  uf: string
  logo: string | null
}

export function mapEmpresa(raw: EmpresaRaw): EmpresaMapeada {
  return {
    fantasia: String(raw.fantasia ?? raw.razaoSocial ?? ''),
    razaoSocial: String(raw.razaoSocial ?? ''),
    cnpjCpf: String(raw.cnpjCpf ?? ''),
    municipio: String(raw.municipio ?? ''),
    uf: String(raw.uf ?? ''),
    logo: raw.logo === undefined || raw.logo === null ? null : String(raw.logo),
  }
}
