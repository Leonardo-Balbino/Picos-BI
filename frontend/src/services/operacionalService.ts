import { apiGetAtual, type QueryParams } from './api'
export interface AtualizacaoOperacional { idLoja: string | null; status: string; executadoEm: string }
export interface ContaReceberItem {
  [key: string]: unknown
  id: string; idDocumento: string; numero: string; nome: string; descricao: string;
  idLoja: string | null; nomeLoja: string; idPessoa: string | null; parcela: string | null;
  dtLancamento: string; dtVencimento: string; dtPagamento: string | null;
  valOrigem: number; valPago: number; valDesconto: number; valSaldo: number;
  situacao: string; parcial: boolean; diasAtraso: number;
}
export interface ContaReceberDetalhe extends ContaReceberItem {
  cliente: { codigo: string | null; nome: string; razaoSocial: string | null; fantasia: string | null;
    cnpjCpf: string | null; telefone: string | null; email: string | null; cadastroLocalizado: boolean }
}
export interface PaginaContasReceber {
  items: ContaReceberItem[]; total: number; page: number; pageSize: number;
  resumo: { saldoAberto: number; titulos: number; clientes: number; saldoVencido: number; titulosVencidos: number };
  atualizacoes: AtualizacaoOperacional[];
}
export interface SecaoEstoque {
  id: string
  descricao: string
  totalItens: number
}
export interface ProdutoEstoque {
  [key: string]: unknown
  codigo: string; descricao: string; embalagem: string; idLoja: string | null; nomeLoja: string;
  idSecao?: string | null; nomeSecao?: string | null;
  saldoFisico: number | null; saldoReservado: number | null; saldoDisponivel: number | null;
  minimoErp: number; limiteAlerta: number; reposicaoSugerida: number | null; status: string;
  locais: Array<{ id: string; descricao: string; saldoFisico: number; saldoReservado: number; dataHoraErp: string }>
}
export interface EstoqueUrgencia {
  locais?: Array<{ id: string; descricao: string; idLoja: string | null }>;
  secoes?: SecaoEstoque[];
  items: ProdutoEstoque[]; resumo: { produtos: number; ruptura: number; baixo: number; semSaldo: number; semMinimo: number };
  atualizacoes: AtualizacaoOperacional[];
}
export const getContasReceber = (query: QueryParams) => apiGetAtual<PaginaContasReceber>('/contas-a-receber/pagina', query)
export const getContaReceber = (id: string) => apiGetAtual<ContaReceberDetalhe>('/contas-a-receber/' + encodeURIComponent(id))
export const getEstoqueUrgencia = (idsLojas: string, limiteAlerta?: number, idSecao?: string) =>
  apiGetAtual<EstoqueUrgencia>('/estoque/urgencia', { idsLojas, limiteAlerta, idSecao: idSecao === 'todas' ? undefined : idSecao })

export interface ClienteReceberItem {
  [key: string]: unknown
  id: string; idPessoa: string | null; idLoja: string | null; nomeLoja: string; nome: string;
  fantasia: string | null; razaoSocial: string | null; parcelas: number; parcelasVencidas: number;
  saldoAberto: number; saldoVencido: number; primeiroVencimento: string;
}
export interface PaginaClientesReceber extends Omit<PaginaContasReceber, 'items'> { items: ClienteReceberItem[] }
export interface ParcelasClienteReceber {
  cliente: ContaReceberDetalhe['cliente']; items: ContaReceberItem[]; total: number; page: number;
  pageSize: number; saldoAberto: number;
}
export const getClientesReceber = (query: QueryParams) => apiGetAtual<PaginaClientesReceber>('/contas-a-receber/clientes', query)
export const getParcelasClienteReceber = (id: string, query: QueryParams) =>
  apiGetAtual<ParcelasClienteReceber>('/contas-a-receber/clientes/' + encodeURIComponent(id) + '/parcelas', query)
