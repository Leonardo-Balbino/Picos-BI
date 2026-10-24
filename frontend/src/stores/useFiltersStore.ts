import { defineStore } from 'pinia'
import type { FiltrosState, PeriodoPreset } from '@/types'
import { paraDataApi, parseDataLocal, addDias } from '@/utils/periodo'

export const useFiltersStore = defineStore('filters', {
  state: (): FiltrosState => ({
    periodo: 'semana',
    range: { inicio: '', fim: '' },
    idCaixa: 'todos',
    lojasSelecionadas: [],
  }),
  getters: {
    dataAtivaIso(state): string {
      const hojeStr = paraDataApi(new Date())
      if (state.periodo === 'dia') return hojeStr
      if (state.periodo === 'ontem') {
        const ontem = addDias(new Date(), -1)
        return paraDataApi(ontem)
      }
      if (state.periodo === 'personalizado' && state.range.inicio) {
        return state.range.inicio
      }
      return hojeStr
    },

    isModoDia(state): boolean {
      if (state.periodo === 'dia' || state.periodo === 'ontem') return true
      if (state.periodo === 'personalizado' && state.range.inicio && state.range.inicio === state.range.fim) {
        return true
      }
      return false
    },

    rotuloDiaAtivo(): string {
      const dataIso = this.dataAtivaIso
      const hojeStr = paraDataApi(new Date())
      const ontemStr = paraDataApi(addDias(new Date(), -1))

      const d = parseDataLocal(dataIso)
      const dataFmt = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')

      if (dataIso === hojeStr) return `Hoje (${dataFmt})`
      if (dataIso === ontemStr) return `Ontem (${dataFmt})`
      return `${diaSemana}, ${dataFmt}`
    },

    podeAvancarDia(): boolean {
      const hojeStr = paraDataApi(new Date())
      return this.dataAtivaIso < hojeStr
    },
  },
  actions: {
    setPreset(preset: PeriodoPreset) {
      if (preset === 'dia') {
        this.setHoje()
      } else if (preset === 'ontem') {
        this.setOntem()
      } else {
        this.periodo = preset
        if (preset !== 'personalizado') {
          this.range = { inicio: '', fim: '' }
        }
      }
    },

    setHoje() {
      const hojeStr = paraDataApi(new Date())
      this.periodo = 'dia'
      this.range = { inicio: hojeStr, fim: hojeStr }
    },

    setOntem() {
      const ontemStr = paraDataApi(addDias(new Date(), -1))
      this.periodo = 'ontem'
      this.range = { inicio: ontemStr, fim: ontemStr }
    },

    setDiaEspecifico(dataIso: string) {
      const hojeStr = paraDataApi(new Date())
      const ontemStr = paraDataApi(addDias(new Date(), -1))

      if (dataIso === hojeStr) {
        this.setHoje()
      } else if (dataIso === ontemStr) {
        this.setOntem()
      } else {
        this.periodo = 'personalizado'
        this.range = { inicio: dataIso, fim: dataIso }
      }
    },

    irParaDiaAnterior() {
      const dataAtual = parseDataLocal(this.dataAtivaIso)
      const anterior = addDias(dataAtual, -1)
      this.setDiaEspecifico(paraDataApi(anterior))
    },

    voltarDiaAnterior() {
      this.irParaDiaAnterior()
    },

    irParaDiaSeguinte() {
      const hojeStr = paraDataApi(new Date())
      if (this.dataAtivaIso >= hojeStr) return
      const dataAtual = parseDataLocal(this.dataAtivaIso)
      const seguinte = addDias(dataAtual, 1)
      this.setDiaEspecifico(paraDataApi(seguinte))
    },

    avancarProximoDia() {
      this.irParaDiaSeguinte()
    },

    setDiaAnterior() {
      this.setOntem()
    },

    setRangePersonalizado(inicio: string, fim: string) {
      this.periodo = 'personalizado'
      this.range = { inicio, fim }
    },

    setLojas(lojas: string[]) {
      this.lojasSelecionadas = [...lojas]
    },

    toggleLoja(id: string) {
      const idx = this.lojasSelecionadas.indexOf(id)
      if (idx >= 0) {
        this.lojasSelecionadas.splice(idx, 1)
      } else {
        this.lojasSelecionadas.push(id)
      }
    },

    limparLojas() {
      this.lojasSelecionadas = []
    },
  },
})
