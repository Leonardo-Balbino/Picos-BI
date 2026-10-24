/**
 * Utilitário e tabela De/Para canônica para Formas de Pagamento.
 * Garante que NUNCA um código numérico ou ID bruto seja exibido na interface.
 */

const MAPEAMENTO_NOMES_PADRAO: Record<string, string> = {
  // Por descrição em maiúsculo
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  'PIX BANCO BRASIL': 'PIX (Banco do Brasil)',
  'PIX SANTANDER': 'PIX (Santander)',
  'CARTAO CREDITO': 'Cartão de Crédito',
  'CARTÃO DE CRÉDITO': 'Cartão de Crédito',
  CREDITO: 'Cartão de Crédito',
  CRÉDITO: 'Cartão de Crédito',
  'CARTAO DEBITO': 'Cartão de Débito',
  'CARTÃO DE DÉBITO': 'Cartão de Débito',
  DEBITO: 'Cartão de Débito',
  DÉBITO: 'Cartão de Débito',
  BOLETO: 'Boleto',
  'BOLETO BANCARIO': 'Boleto Bancário',
  'BOLETO BANCÁRIO': 'Boleto Bancário',
  'A PRAZO': 'A Prazo (Crediário)',
  'CREDITO LOJA': 'Crédito Loja',
  'VENDA ON LINE': 'Venda Online',
  'VENDA ONLINE': 'Venda Online',
  OUTROS: 'Outros',
  TROCO: 'Troco',

  // Por idTipo oficial do ERP
  '1': 'Dinheiro',
  '3': 'Cartão de Crédito',
  '4': 'Cartão de Débito',
  '5': 'Crédito Loja / A Prazo',
  '15': 'Boleto Bancário',
  '17': 'PIX Dinâmico',
  '20': 'PIX',
  '99': 'Outros',
}

/**
 * Normaliza qualquer identificador, descrição bruta ou idTipo para um rótulo legível e amigável.
 * Nunca retorna código puramente numérico.
 */
export function normalizarNomeFormaPagamento(
  idPagamento: string,
  descricao?: string,
  tipoDescricao?: string,
): string {
  // 1. Se tem descrição textual com mais de 1 caractere não numérico, prioriza normalização dela
  if (descricao && typeof descricao === 'string' && /[a-zA-Z]/.test(descricao)) {
    const limpo = descricao.trim().toUpperCase()
    if (MAPEAMENTO_NOMES_PADRAO[limpo]) {
      return MAPEAMENTO_NOMES_PADRAO[limpo]
    }
    // Detecção por padrões comuns na string
    if (limpo.includes('PIX')) {
      if (limpo.includes('BRASIL')) return 'PIX (Banco do Brasil)'
      if (limpo.includes('SANTANDER')) return 'PIX (Santander)'
      return 'PIX'
    }
    if (limpo.includes('CREDITO') || limpo.includes('CRÉDITO')) return 'Cartão de Crédito'
    if (limpo.includes('DEBITO') || limpo.includes('DÉBITO')) return 'Cartão de Débito'
    if (limpo.includes('BOLETO')) return 'Boleto Bancário'
    if (limpo.includes('PRAZO')) return 'A Prazo (Crediário)'
    if (limpo.includes('DINHEIRO')) return 'Dinheiro'
    if (limpo.includes('ONLINE') || limpo.includes('ON LINE')) return 'Venda Online'
    if (limpo.includes('TROCO')) return 'Troco'

    // Formata em Title Case caso seja um nome customizado
    return descricao
      .trim()
      .split(' ')
      .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
      .join(' ')
  }

  // 2. Se temos tipoDescricao do ERP
  if (tipoDescricao && typeof tipoDescricao === 'string' && /[a-zA-Z]/.test(tipoDescricao)) {
    const tdLimpo = tipoDescricao.trim().toUpperCase()
    if (tdLimpo.includes('PAGAMENTO INSTANTÂNEO') || tdLimpo.includes('PIX')) return 'PIX'
    if (tdLimpo.includes('CRÉDITO') || tdLimpo.includes('CREDITO')) return 'Cartão de Crédito'
    if (tdLimpo.includes('DÉBITO') || tdLimpo.includes('DEBITO')) return 'Cartão de Débito'
    if (tdLimpo.includes('BOLETO')) return 'Boleto Bancário'
    if (tdLimpo.includes('LOJA')) return 'A Prazo (Crediário)'
    return tipoDescricao.trim()
  }

  // 3. Fallback por mapeamento de código conhecido
  const idLimpo = String(idPagamento ?? '').replace(/^.*_/, '').trim()
  if (MAPEAMENTO_NOMES_PADRAO[idLimpo]) {
    return MAPEAMENTO_NOMES_PADRAO[idLimpo]
  }

  // 4. Se chegou aqui sendo puramente numérico, converte para modalidade correspondente ou "Forma de Pagamento"
  const num = parseInt(idLimpo, 10)
  if (!Number.isNaN(num)) {
    switch (num) {
      case 1:
        return 'Dinheiro'
      case 2:
        return 'PIX'
      case 3:
        return 'Cartão de Crédito'
      case 4:
        return 'Cartão de Débito'
      case 5:
        return 'Boleto'
      case 6:
        return 'Venda Online'
      case 7:
        return 'A Prazo (Crediário)'
      default:
        return `Modalidade ${num}`
    }
  }

  return idPagamento || 'Outros'
}
