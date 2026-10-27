import type { PeriodoPreset, PeriodoRange } from '@/types'

export interface Intervalo {
  inicio: Date
  fim: Date
}

/** Janela padrão para operações operacionais e consultas rotineiras (90 dias). */
export const JANELA_PADRAO_DIAS = 90

/** Janela histórica para registro de faturamento (1 ano completo = 365 dias). */
export const JANELA_FATURAMENTO_DIAS = 365

export const JANELA_MAXIMA_DIAS = JANELA_FATURAMENTO_DIAS

function inicioDoDia(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function fimDoDia(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
export function addDias(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000)
}

export function parseDataLocal(dataIso: string): Date {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  return new Date(ano, (mes || 1) - 1, dia || 1)
}

export function resolverIntervalo(periodo: PeriodoPreset, range: PeriodoRange, agora: Date = new Date()): Intervalo {
  const fim = fimDoDia(agora)
  const intervalo = ((): Intervalo => {
    switch (periodo) {
      case 'dia':
        return { inicio: inicioDoDia(agora), fim }
      case 'ontem':
      case 'dia-anterior': {
        const ontem = addDias(agora, -1)
        return { inicio: inicioDoDia(ontem), fim: fimDoDia(ontem) }
      }
      case 'semana':
        return { inicio: inicioDoDia(addDias(agora, -6)), fim }
      case 'trimestre':
      case 'semestre':
        // Intervalo de 90 dias
        return { inicio: inicioDoDia(addDias(agora, -(JANELA_PADRAO_DIAS - 1))), fim }
      case 'ano':
        // Faturamento com registro de 1 ano completo (365 dias)
        return { inicio: inicioDoDia(addDias(agora, -(JANELA_FATURAMENTO_DIAS - 1))), fim }
      case 'personalizado': {
        const ontem = addDias(agora, -1)
        const inicioParsed = range.inicio ? inicioDoDia(parseDataLocal(range.inicio)) : inicioDoDia(ontem)
        const fimParsed = range.fim
          ? fimDoDia(parseDataLocal(range.fim))
          : (range.inicio ? fimDoDia(parseDataLocal(range.inicio)) : fimDoDia(ontem))
        return {
          inicio: inicioParsed,
          fim: fimParsed,
        }
      }
      case 'mes-anterior':
        return { inicio: new Date(agora.getFullYear(), agora.getMonth() - 1, 1), fim: fimDoDia(new Date(agora.getFullYear(), agora.getMonth(), 0)) }
      case 'mes':
      default:
        return { inicio: new Date(agora.getFullYear(), agora.getMonth(), 1), fim }
    }
  })()

  // Limite máximo: até 365 dias para faturamento
  const limiteMinimo = inicioDoDia(addDias(agora, -JANELA_FATURAMENTO_DIAS))
  if (intervalo.inicio < limiteMinimo) return { inicio: limiteMinimo, fim: intervalo.fim }
  return intervalo
}

/**
 * `YYYY-MM-DD` — formato de data de domínio que o backend espera em `inicio`/`fim`
 * (`PeriodoQueryDto`, `IsDateString({ strict: true })`, ver `backend/src/common/dto`). Só a
 * data, sem hora: o backend já trata "dia" como a unidade da janela de 365 dias, mandar
 * timestamp aqui quebra o parse do lado dele.
 */
export function paraDataApi(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function obterDiaAnteriorIso(agora: Date = new Date()): string {
  return paraDataApi(addDias(agora, -1))
}

