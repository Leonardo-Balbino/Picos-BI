export interface ColunaExport {
  chave: string
  rotulo: string
}

function escaparCsv(valor: unknown): string {
  const texto = String(valor ?? '')
  if (/[",;\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

/** `;` como separador (não `,`) porque no Excel em pt-BR a vírgula é separador decimal. */
export function gerarCsv(colunas: ColunaExport[], linhas: Record<string, unknown>[]): string {
  const cabecalho = colunas.map((c) => escaparCsv(c.rotulo)).join(';')
  const corpo = linhas.map((linha) => colunas.map((c) => escaparCsv(linha[c.chave])).join(';')).join('\n')
  const BOM_UTF8 = '﻿' // sem isso o Excel abre acentuação quebrada
  return `${BOM_UTF8}${cabecalho}\n${corpo}`
}

function baixarArquivo(nomeArquivo: string, conteudo: string, tipoMime: string): void {
  const blob = new Blob([conteudo], { type: tipoMime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportarCsv(nomeArquivo: string, colunas: ColunaExport[], linhas: Record<string, unknown>[]): void {
  baixarArquivo(`${nomeArquivo}.csv`, gerarCsv(colunas, linhas), 'text/csv;charset=utf-8;')
}

/** "Exportar PDF" = diálogo de impressão nativo do navegador (destino "Salvar como PDF") — ver `@media print` em `style.css`. */
export function imprimir(): void {
  window.print()
}
