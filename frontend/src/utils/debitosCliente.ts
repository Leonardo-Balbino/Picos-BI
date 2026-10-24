import { jsPDF } from 'jspdf'
import type { ContaReceberItem, ParcelasClienteReceber } from '../services/operacionalService'

export interface ComprovanteDebitos {
  empresa: string
  cliente: ParcelasClienteReceber['cliente']
  items: ContaReceberItem[]
  emitidoEm: Date
}
interface Texto { tipo: 'texto'; texto: string; x: number; y: number; tamanho: number; negrito: boolean; alinhamento: 'left' | 'right' | 'center' }
interface Linha { tipo: 'linha'; y: number }
type Operacao = Texto | Linha
export interface PaginaComprovante { altura: number; operacoes: Operacao[] }
const largura = 80, margem = 4, util = largura - 2 * margem, limite = 1195
const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const soma = (items: ContaReceberItem[], campo: 'valOrigem' | 'valPago' | 'valSaldo') =>
  items.reduce((n, item) => n + Math.round(item[campo] * 100), 0) / 100
const textoSeguro = (s: unknown) => String(s ?? '').normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\u0020-\u00ff]/g, '').trim()
const escapar = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
export async function coletarParcelasDebitos(
  getPagina: (page: number) => Promise<ParcelasClienteReceber>,
  vigente: () => boolean = () => true,
): Promise<ParcelasClienteReceber> {
  const primeira = await getPagina(1)
  const items = [...primeira.items]
  for (let page = 2; items.length < primeira.total; page++) {
    if (!vigente()) throw new DOMException('Consulta cancelada', 'AbortError')
    const proxima = await getPagina(page)
    if (!proxima.items.length || proxima.total !== primeira.total ||
        Math.abs(proxima.saldoAberto - primeira.saldoAberto) > 0.01) {
      throw new Error('As parcelas mudaram durante a consulta. Tente novamente.')
    }
    items.push(...proxima.items)
  }
  const saldo = items.reduce((s, i) => s + Math.round(i.valSaldo * 100), 0) / 100
  if (items.length !== primeira.total || new Set(items.map(i => i.id)).size !== items.length ||
      Math.abs(saldo - primeira.saldoAberto) > 0.01) {
    throw new Error('Não foi possível conferir todas as parcelas. Tente novamente.')
  }
  return { ...primeira, items }
}
export function dataDebito(s: string) {
  const partes = s.slice(0, 10).split('-')
  return partes.length === 3 ? partes[2] + '/' + partes[1] + '/' + partes[0] : '-'
}
export function nomeArquivoDebitos(dados: ComprovanteDebitos) {
  const nome = dados.cliente.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 70) || 'cliente'
  return 'debitos-' + nome.toLowerCase() + '.pdf'
}

/** Uma única disposição em mm alimenta o PDF, a prévia e a impressão. */
export function paginarDebitos(dados: ComprovanteDebitos): PaginaComprovante[] {
  if (!dados.items.length) throw new Error('Não há parcelas em aberto para imprimir.')
  if (new Set(dados.items.map(i => i.id)).size !== dados.items.length ||
      dados.items.some(i => ![i.valOrigem, i.valPago, i.valSaldo].every(Number.isFinite) || i.valSaldo <= 0)) {
    throw new Error('Não foi possível conferir as parcelas. Atualize e tente novamente.')
  }
  const medida = new jsPDF({ unit: 'mm', format: [80, 280] })
  const paginas: PaginaComprovante[] = []
  let ops: Operacao[] = [], y = 5
  function texto(s: unknown, x = margem, tamanho = 9, negrito = false, alinhamento: Texto['alinhamento'] = 'left', max = util) {
    medida.setFont('helvetica', negrito ? 'bold' : 'normal'); medida.setFontSize(tamanho)
    const linhas = medida.splitTextToSize(textoSeguro(s), max) as string[]
    for (const linha of linhas) {
      ops.push({ tipo: 'texto', texto: linha, x, y, tamanho, negrito, alinhamento })
      y += tamanho * 0.352778 * 1.15
    }
  }
  function linha() { ops.push({ tipo: 'linha', y: y - 1.2 }); y += 3 }
  function campo(label: string, valor: string, negrito = false) {
    const inicio = y
    texto(label, margem, 8.5, false, 'left', 32)
    const fimRotulo = y
    y = inicio
    texto(valor, largura - margem, 9.5, negrito, 'right', 38)
    y = Math.max(y, fimRotulo, inicio + 3.6)
  }
  function dupla(esquerda: string, direita: string) {
    const inicio = y
    texto(esquerda, margem, 9, false, 'left', 35)
    const fimEsquerda = y
    y = inicio
    texto(direita, largura - margem, 9, false, 'right', 35)
    y = Math.max(y, fimEsquerda, inicio + 3.6)
  }
  function cabecalho(continuacao = false) {
    texto(dados.empresa, 40, 9.5, true, 'center')
    texto('PARCELAS DO CLIENTE', 40, 9.5, true, 'center')
    if (continuacao) texto('Continuação', 40, 8, false, 'center')
    linha()
    texto(dados.cliente.nome || 'Cliente não informado', margem, 9.5, true)
    if (dados.cliente.razaoSocial && dados.cliente.razaoSocial !== dados.cliente.nome) texto(dados.cliente.razaoSocial, margem, 8)
    texto('Emissão: ' + dados.emitidoEm.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }), margem, 7.5)
    linha()
  }
  function fechar() { paginas.push({ altura: Math.max(50, Math.ceil(y + 2)), operacoes: ops }); ops = []; y = 5 }
  cabecalho()
  for (const item of dados.items) {
    // Mede o bloco inteiro para nunca separar os valores de uma parcela entre páginas.
    const inicio = y, n = ops.length
    const bloco = () => {
      dupla('Doc. ' + textoSeguro(item.numero || item.idDocumento || '-') + (item.parcela ? ' / Parc. ' + textoSeguro(item.parcela) : ''),
        'Venc. ' + dataDebito(item.dtVencimento))
      dupla('Original: ' + moeda(item.valOrigem), 'Pago: ' + moeda(item.valPago))
      campo('Em aberto', moeda(item.valSaldo), true)
      linha()
    }
    bloco()
    if (y > limite) {
      ops.splice(n); y = inicio; fechar(); cabecalho(true); bloco()
    }
  }
  if (y + 22 > limite) { fechar(); cabecalho(true) }
  campo('Parcelas', String(dados.items.length))
  dupla('Original: ' + moeda(soma(dados.items, 'valOrigem')), 'Pago: ' + moeda(soma(dados.items, 'valPago')))
  campo('TOTAL EM ABERTO', moeda(soma(dados.items, 'valSaldo')), true)
  y += 1
  texto('Valores em aberto na data da emissão.', 40, 7.5, false, 'center')
  fechar()
  return paginas
}
export function criarPdfDebitos(dados: ComprovanteDebitos): Blob {
  const paginas = paginarDebitos(dados)
  const pdf = new jsPDF({ unit: 'mm', format: [80, paginas[0]!.altura], orientation: paginas[0]!.altura < largura ? 'landscape' : 'portrait', compress: true })
  pdf.setProperties({ title: 'Débitos - ' + textoSeguro(dados.cliente.nome), subject: 'Parcelas em aberto', creator: 'PICOS Analytics' })
  paginas.forEach((pagina, indice) => {
    if (indice) pdf.addPage([80, pagina.altura], pagina.altura < largura ? 'landscape' : 'portrait')
    for (const op of pagina.operacoes) {
      if (op.tipo === 'linha') { pdf.setDrawColor(80); pdf.setLineWidth(0.15); pdf.line(margem, op.y, largura - margem, op.y); continue }
      pdf.setTextColor(0); pdf.setFont('helvetica', op.negrito ? 'bold' : 'normal'); pdf.setFontSize(op.tamanho)
      pdf.text(op.texto, op.x, op.y, { align: op.alinhamento })
    }
  })
  return pdf.output('blob')
}
export function previaDebitos(dados: ComprovanteDebitos): string {
  return paginarDebitos(dados).map((pagina, i) => '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comprovante de débitos, página ' + (i + 1) + '" width="80mm" height="' + pagina.altura + 'mm" viewBox="0 0 80 ' + pagina.altura + '" style="display:block;background:white;max-width:100%;height:auto">' +
    pagina.operacoes.map(op => op.tipo === 'linha'
      ? '<line x1="4" x2="76" y1="' + op.y + '" y2="' + op.y + '" stroke="#505050" stroke-width=".15"/>'
      : '<text x="' + op.x + '" y="' + op.y + '" fill="#000" font-family="Arial,Helvetica,sans-serif" font-size="' + (op.tamanho * 0.352778) + '" font-weight="' + (op.negrito ? '700' : '400') + '" text-anchor="' + ({ left: 'start', right: 'end', center: 'middle' }[op.alinhamento]) + '">' + escapar(op.texto) + '</text>').join('') + '</svg>').join('')
}
export function imprimirDebitos(dados: ComprovanteDebitos) {
  const paginas = paginarDebitos(dados)
  const janela = window.open('', '_blank', 'popup,width=480,height=720')
  if (!janela) throw new Error('Permita abrir a janela de impressão neste navegador e tente novamente.')
  const html = previaDebitos(dados)
  janela.addEventListener('load', () => { janela.focus(); janela.print() }, { once: true })
  janela.document.open()
  janela.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Débitos do cliente</title><style>body{margin:0;background:#fff;color:#000}section{width:80mm;margin:0;break-after:page}section:last-child{break-after:auto}svg{width:80mm!important;max-width:none!important}button{margin:12px;padding:10px;font:14px Arial}.orientacao{font:14px Arial;padding:0 12px}'+
    '@page{size:80mm '+paginas[0]!.altura+'mm;margin:0}' +
    (paginas.length > 1 ? paginas.map((p,i) => '@page recibo'+i+'{size:80mm '+p.altura+'mm;margin:0}.recibo'+i+'{page:recibo'+i+'}').join('') : '')+
    '@media print{html,body{width:80mm!important;margin:0!important;padding:0!important}button,.orientacao{display:none}}</style></head><body><button onclick="window.print()">Selecionar impressora e imprimir</button><p class="orientacao">Selecione papel de 80 mm contínuo, escala 100%, margens Nenhuma e desative Cabeçalhos e rodapés.</p>'+
    html.split('</svg>').filter(Boolean).map((svg,i) => '<section'+(paginas.length > 1 ? ' class="recibo'+i+'"' : '')+'>'+svg+'</svg></section>').join('')+
    '</body></html>')
  janela.document.close()
  janela.focus()
  // O navegador solicita a impressora; não há impressão automática sem o diálogo.
}
export function baixarPdfDebitos(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.href = url; link.download = nome
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
