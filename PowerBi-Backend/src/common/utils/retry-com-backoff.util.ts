import { Logger } from '@nestjs/common'

export interface OpcoesRetryComBackoff {
  /** Falhas seguidas antes de desistir e propagar o erro. Default: 10. */
  maxTentativas?: number
  /** Espera antes da 2ª tentativa; dobra a cada falha seguinte. Default: 1000ms. */
  baseDelayMs?: number
  /** Teto do backoff exponencial, pra não esperar minutos entre tentativas. Default: 30000ms. */
  maxDelayMs?: number
  /** Nome da operação, só pra identificar a mensagem de log. Default: "operação". */
  descricao?: string
  logger?: Pick<Logger, 'log' | 'warn' | 'error'>
}

const DEFAULTS = {
  maxTentativas: 10,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  descricao: 'operação',
}

/**
 * Executa `acao` com retry e backoff exponencial (teto em `maxDelayMs`).
 *
 * Motivo de existir: na infra consolidada (múltiplos clientes numa VPS, Postgres
 * central numa stack Docker Compose separada da app), não existe mais
 * `depends_on: condition: service_healthy` garantindo que o banco já esteja no ar
 * quando o container da app sobe. A app não pode morrer de primeira só porque o
 * banco demorou a responder, mas também não pode ficar tentando pra sempre em
 * silêncio: cada falha é logada (warn) pra aparecer no monitoramento, e depois de
 * `maxTentativas` seguidas o erro é propagado — quem decide reiniciar o processo
 * depois disso é o orquestrador (Docker), não um loop interno. Mesmo padrão do
 * Picos-gestao-back (repositório-gabarito da migração) — ver MIGRACAO.md.
 */
export async function retryComBackoff(
  acao: () => Promise<void>,
  opcoes: OpcoesRetryComBackoff = {},
): Promise<void> {
  const config = { ...DEFAULTS, ...opcoes }
  const logger = opcoes.logger ?? new Logger('RetryComBackoff')

  for (let tentativa = 1; tentativa <= config.maxTentativas; tentativa++) {
    try {
      await acao()
      if (tentativa > 1) {
        logger.log(`${config.descricao}: sucesso na tentativa ${tentativa}.`)
      }
      return
    } catch (error: unknown) {
      const mensagem = error instanceof Error ? error.message : String(error)
      const ultimaTentativa = tentativa >= config.maxTentativas

      if (ultimaTentativa) {
        logger.error(
          `${config.descricao}: falhou após ${tentativa} tentativa(s) — desistindo. Último erro: ${mensagem}`,
        )
        throw error
      }

      const delay = Math.min(config.baseDelayMs * 2 ** (tentativa - 1), config.maxDelayMs)
      logger.warn(
        `${config.descricao}: falha na tentativa ${tentativa}/${config.maxTentativas} (${mensagem}). ` +
          `Nova tentativa em ${delay}ms.`,
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}
