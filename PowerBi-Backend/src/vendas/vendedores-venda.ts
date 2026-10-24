import { isVendaValida, type DocumentoParcial } from './venda-valida.util'

export interface VendedorVendaMapeado { codigo: string; nome: string; valor: number }
const SEM_VENDEDOR = '__sem_vendedor__'
const moeda = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function mapVendedoresItens(lista: unknown[]): VendedorVendaMapeado[] {
  const grupos = new Map<string, VendedorVendaMapeado>()
  for (const wrapper of lista) {
    if (!wrapper || typeof wrapper !== 'object') continue
    const item = (wrapper as Record<string, unknown>).documentoMercadoria
    if (!item || typeof item !== 'object') continue
    const raw = item as Record<string, unknown>
    const valor = Number(raw.valTotalLiquido)
    if (raw.valTotalLiquido == null || !Number.isFinite(valor)) continue
    const id = String(raw.idPessoaFuncionario ?? '').trim()
    const codigo = id && id !== '0' ? id : SEM_VENDEDOR
    const nome = codigo === SEM_VENDEDOR ? 'Sem vendedor informado' : String(raw.nomePessoaFuncionario ?? '').trim() || 'Vendedor ' + codigo
    const atual = grupos.get(codigo) ?? { codigo, nome, valor: 0 }
    atual.valor += valor
    grupos.set(codigo, atual)
  }
  return [...grupos.values()].map(g => ({ ...g, valor: moeda(g.valor) }))
}

interface VendaDetalhada extends DocumentoParcial {
  codigo: string; idLoja: string | null; vendedores: unknown; loja?: { nome: string } | null
}
export function resumirVendedores(vendas: VendaDetalhada[]) {
  const grupos = new Map<string, { codigo: string; idLoja: string | null; nome: string; nomeLoja: string; quantidadeVendas: number; totalVendido: number }>()
  let vendasAnalisadas = 0, vendasSemDetalhamento = 0, totalVendas = 0, valorSemDetalhamento = 0
  for (const venda of vendas) {
    if (!isVendaValida(venda) || Number(venda.valTotal) <= 0) continue
    vendasAnalisadas++; totalVendas += Number(venda.valTotal)
    if (!Array.isArray(venda.vendedores)) { vendasSemDetalhamento++; valorSemDetalhamento += Number(venda.valTotal); continue }
    // Reagrupar também na leitura impede contar duas vezes o mesmo vendedor no documento.
    const porDocumento = new Map<string, VendedorVendaMapeado>()
    for (const bruto of venda.vendedores) {
      if (!bruto || typeof bruto !== 'object') continue
      const item = bruto as Record<string, unknown>
      if (typeof item.codigo !== 'string' || typeof item.nome !== 'string' || typeof item.valor !== 'number' || !Number.isFinite(item.valor)) continue
      const atual = porDocumento.get(item.codigo) ?? { codigo: item.codigo, nome: item.nome, valor: 0 }
      atual.valor += item.valor; porDocumento.set(item.codigo, atual)
    }
    if (!porDocumento.size) porDocumento.set(SEM_VENDEDOR, { codigo: SEM_VENDEDOR, nome: 'Sem vendedor informado', valor: Number(venda.valTotal) })
    for (const item of porDocumento.values()) {
      const chave = JSON.stringify([venda.idLoja, item.codigo])
      const grupo = grupos.get(chave) ?? { codigo: item.codigo, idLoja: venda.idLoja, nome: item.nome,
        nomeLoja: venda.loja?.nome ?? 'Unidade não informada', quantidadeVendas: 0, totalVendido: 0 }
      grupo.quantidadeVendas++; grupo.totalVendido += item.valor; grupos.set(chave, grupo)
    }
  }
  const items = [...grupos.values()]
    .map(g => ({
      ...g,
      totalVendido: moeda(g.totalVendido),
      ticketMedio: g.quantidadeVendas > 0 ? moeda(g.totalVendido / g.quantidadeVendas) : 0,
    }))
    .sort((a, b) => b.totalVendido - a.totalVendido || a.nome.localeCompare(b.nome))
  const totalAtribuido = moeda(items.reduce((s,g) => s+g.totalVendido,0))
  return { items, vendasAnalisadas, vendasSemDetalhamento, totalVendas: moeda(totalVendas),
    valorSemDetalhamento: moeda(valorSemDetalhamento), totalAtribuido,
    diferencaItens: moeda(totalVendas-valorSemDetalhamento-totalAtribuido) }
}
