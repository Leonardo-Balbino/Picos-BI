import type { PeriodoPreset, PeriodoRange } from '@/types'

export interface Intervalo {
  inicio: Date
  fim: Date
}

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
function addDias(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000)
}

export function resolverIntervalo(periodo: PeriodoPreset, range: PeriodoRange, agora: Date = new Date()): Intervalo {
  const fim = fimDoDia(agora)
  switch (periodo) {
    case 'dia':
      return { inicio: inicioDoDia(agora), fim }
    case 'semana':
      return { inicio: inicioDoDia(addDias(agora, -6)), fim }
    case 'semestre': {
      const inicioSemestre = agora.getMonth() < 6 ? 0 : 6
      return { inicio: new Date(agora.getFullYear(), inicioSemestre, 1), fim }
    }
    case 'ano':
      return { inicio: new Date(agora.getFullYear(), 0, 1), fim }
    case 'personalizado':
      return {
        inicio: range.inicio ? inicioDoDia(new Date(range.inicio)) : inicioDoDia(addDias(agora, -29)),
        fim: range.fim ? fimDoDia(new Date(range.fim)) : fim,
      }
    case 'mes':
    default:
      return { inicio: new Date(agora.getFullYear(), agora.getMonth(), 1), fim }
  }
}

export function resolverIntervaloAnterior(atual: Intervalo): Intervalo {
  const duracaoMs = atual.fim.getTime() - atual.inicio.getTime()
  const fimAnterior = new Date(atual.inicio.getTime() - 1)
  const inicioAnterior = new Date(fimAnterior.getTime() - duracaoMs)
  return { inicio: inicioAnterior, fim: fimAnterior }
}

/**
 * Formato local `YYYY-MM-DDTHH:mm:ss`, sem timezone explícito — a semântica exata de fuso
 * de `documento/v1` (`dataHora` x `dataHoraMovimento` x `gmt`) não foi confirmada ainda
 * (seção 14.5 do prompt de edição v2); ajustar aqui quando isso for inspecionado.
 */
export function paraDataHoraApi(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
