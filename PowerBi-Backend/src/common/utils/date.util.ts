/**
 * Utilitários de data — únicos deste projeto que sabem sobre "dia calendário" vs. timestamp.
 *
 * Regra de ouro (ver nota de topo em `prisma/schema.prisma`): qualquer string de data vinda da
 * API Meu ERP Online é tratada como texto até o último momento possível. Nunca passamos essas
 * strings por `new Date(string)` — o fuso horário que a API usa não é documentado, e um parse
 * via `Date` interpreta a string no fuso do processo Node, arriscando deslocar o dia perto da
 * meia-noite. Em vez disso, sempre fatiamos os 10 primeiros caracteres (`YYYY-MM-DD`) e
 * construímos a data por aritmética civil em UTC (`Date.UTC`), nunca `new Date(ano, mes, dia)`
 * (que usa o fuso local do processo).
 */

const REGEX_DATA_ISO = /^\d{4}-\d{2}-\d{2}/

/** Extrai `YYYY-MM-DD` do início de uma string de data/timestamp da API — sem parsing de fuso. */
export function fatiarDiaIso(valor: string): string {
  const match = REGEX_DATA_ISO.exec(valor)
  if (!match) {
    throw new Error(`Data fora do formato esperado (YYYY-MM-DD...): "${valor}"`)
  }
  return match[0]
}

/** `YYYY-MM-DD` -> meia-noite UTC daquele dia, pra gravar num campo `@db.Date` do Prisma. */
export function diaIsoParaDate(diaIso: string): Date {
  const [ano, mes, dia] = diaIso.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia))
}

/** Atalho: string bruta da API (timestamp ou data) -> `Date` de meia-noite UTC do dia. */
export function stringApiParaDia(valor: string): Date {
  return diaIsoParaDate(fatiarDiaIso(valor))
}

/** `Date` (meia-noite UTC) -> `YYYY-MM-DD`, pro formato de data de domínio (nunca outro). */
export function dateParaDiaIso(data: Date): string {
  return data.toISOString().slice(0, 10)
}

/** "Hoje" em UTC, com hora zerada — base de todo cálculo de janela. */
export function hojeUtc(): Date {
  const agora = new Date()
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()))
}

export function subtrairDias(data: Date, dias: number): Date {
  return new Date(data.getTime() - dias * 86_400_000)
}

export function somarDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * 86_400_000)
}

/** Lista de `Date` (um por dia), do dia `inicio` ao dia `fim`, ambos inclusive. */
export function listarDias(inicio: Date, fim: Date): Date[] {
  const dias: Date[] = []
  for (let d = inicio; d.getTime() <= fim.getTime(); d = somarDias(d, 1)) {
    dias.push(d)
  }
  return dias
}

export function diferencaEmDias(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

/**
 * A API Meu ERP Online trata `DataFim`/`dataFim` como exclusivo de `00:00:00` daquele dia quando
 * só a data (`YYYY-MM-DD`) é passada — confirmado por inspeção real: `DataInicio=DataFim=X`
 * sempre devolve `total:0` em `/documento/v1` e `/documento/mercadorias-vendidas/v1`, mesmo
 * havendo documentos reais com `dataHora` em X; só com hora explícita de fim de dia (ou o dia
 * seguinte como `DataFim`) os registros de X aparecem. Pra sincronizar "o dia X inteiro" com uma
 * única chamada, todo `sincronizarDia` manda hora explícita em vez do formato puro `YYYY-MM-DD`.
 */
export function limitesDoDiaParaErp(diaIso: string): { inicio: string; fim: string } {
  return { inicio: `${diaIso}T00:00:00`, fim: `${diaIso}T23:59:59` }
}

/** Dia civil de São Paulo, representado à meia-noite UTC para os campos @db.Date. */
export function hojeSaoPaulo(agora: Date = new Date()): Date {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(agora)
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)!.value
  return diaIsoParaDate(valor('year') + '-' + valor('month') + '-' + valor('day'))
}
