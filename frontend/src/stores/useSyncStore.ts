import { defineStore } from 'pinia'
import { apiGetAtual } from '@/services/api'

interface UnidadeSync {
  idLoja: string
  nome: string
  status: 'SUCESSO' | 'ERRO' | 'PENDENTE'
  ultimaTentativa: string | null
  ultimoSucesso: string | null
  dataReferencia: string
}

export const useSyncStore = defineStore('sync', {
  state: () => ({
    unidades: [] as UnidadeSync[], carregando: false, erro: false,
    assinatura: '', versao: 0, agora: Date.now(),
  }),
  getters: {
    aviso(state): boolean {
      return state.erro || state.unidades.length === 0 || state.unidades.some((u) =>
        u.status !== 'SUCESSO' || !u.ultimoSucesso || state.agora - Date.parse(u.ultimoSucesso) > 15 * 60_000)
    },
    descricao(state): string {
      if (state.erro) return 'Não foi possível consultar a sincronização'
      if (!state.unidades.length) return 'Aguardando status de sincronização'
      if (state.unidades.some((u) => u.status === 'ERRO')) return 'Falha na última sincronização; últimos dados preservados'
      if (state.unidades.some((u) => !u.ultimoSucesso)) return 'Aguardando a primeira sincronização de hoje'
      const ultima = new Date(Math.min(...state.unidades.map((u) => Date.parse(u.ultimoSucesso!))))
      const hora = ultima.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
      return (state.agora - ultima.getTime() > 15 * 60_000 ? 'Sincronização atrasada · último sucesso ' : 'Última sincronização concluída · ') + hora
    },
  },
  actions: {
    async consultar(idsLojas: string) {
      const versao = ++this.versao
      this.carregando = true
      try {
        const resposta = await apiGetAtual<{ unidades: UnidadeSync[] }>('/sync/atualizacao', { idsLojas })
        if (versao !== this.versao) return false
        const assinatura = JSON.stringify(resposta.unidades.map((u) => [u.idLoja, u.ultimoSucesso, u.dataReferencia]))
        const mudou = this.assinatura !== assinatura
        this.unidades = resposta.unidades
        this.assinatura = assinatura
        this.erro = false
        this.agora = Date.now()
        return mudou
      } catch {
        if (versao === this.versao) this.erro = true
        return false
      } finally {
        if (versao === this.versao) this.carregando = false
      }
    },
  },
})
