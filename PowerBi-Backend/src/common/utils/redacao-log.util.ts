/**
 * Campos que podem aparecer em log, em qualquer nível de aninhamento — todo o
 * resto sai como `[REDACTED]`.
 *
 * Lista de PERMISSÃO, não de proibição, de propósito (mesmo padrão do
 * Picos-gestao-back, repositório-gabarito da migração — ver MIGRACAO.md
 * deste repositório): uma lista de proibição falha silenciosamente no dia em
 * que alguém adiciona um campo novo ao schema e esquece de atualizá-la — e
 * ninguém percebe, porque o sintoma é um log que *parece* normal. Com lista
 * de permissão, todo campo novo nasce oculto por padrão.
 *
 * Cobre estruturalmente, sem precisar listar cada um: valor de venda,
 * comissão, nome/documento de cliente, token da Meu ERP Online, chave de API
 * — nenhum desses precisa estar numa lista de bloqueio porque nenhum está
 * nesta lista de permissão.
 */
export const CAMPOS_PERMITIDOS_EM_LOG: ReadonlySet<string> = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'status',
  'tipo',
  // Identificadores de correlação de requisição — úteis pra rastrear um
  // fluxo entre logs sem carregar dado nenhum de domínio.
  'requestId',
  'correlationId',
  'traceId',
])

const MARCADOR_REDACTED = '[REDACTED]' as const

/**
 * Redige recursivamente qualquer valor (objeto, array, ou primitivo) segundo
 * `CAMPOS_PERMITIDOS_EM_LOG`. Nunca lança — usado direto em caminho de log,
 * onde uma exceção aqui não pode derrubar a request nem mascarar o erro
 * original que estava sendo logado.
 */
export function redigir(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map((item) => redigir(item))
  }

  if (valor instanceof Date) {
    return valor.toISOString()
  }

  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(([chave, v]) => [
        chave,
        CAMPOS_PERMITIDOS_EM_LOG.has(chave) ? redigir(v) : MARCADOR_REDACTED,
      ]),
    )
  }

  return valor
}
