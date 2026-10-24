<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose } from 'reka-ui'
import BaseButton from '@/components/ui/BaseButton.vue'
import { getParcelasClienteReceber, type ClienteReceberItem } from '@/services/operacionalService'
import type { QueryParams } from '@/services/api'
import { coletarParcelasDebitos, criarPdfDebitos, previaDebitos, nomeArquivoDebitos, baixarPdfDebitos, imprimirDebitos, type ComprovanteDebitos } from '@/utils/debitosCliente'
const props = defineProps<{ open: boolean; cliente: ClienteReceberItem | null; query: QueryParams }>()
const emit = defineEmits<{ 'update:open': [boolean] }>()
const dados = ref<ComprovanteDebitos | null>(null), pdf = ref<Blob | null>(null)
const carregando = ref(false), compartilhando = ref(false), erro = ref(''), aviso = ref('')
let pedido = 0
const previa = computed(() => dados.value ? previaDebitos(dados.value) : '')
async function carregar() {
  const id = props.cliente?.id, empresa = props.cliente?.nomeLoja
  if (!id || !props.open) return
  const atual = ++pedido
  carregando.value = true; dados.value = null; pdf.value = null; erro.value = ''; aviso.value = ''
  try {
    const query = { ...props.query, pageSize: 100 }
    const todas = await coletarParcelasDebitos(
      page => getParcelasClienteReceber(id, { ...query, page }),
      () => atual === pedido,
    )
    if (atual !== pedido) return
    const comprovante: ComprovanteDebitos = { empresa: empresa || 'PICOS Analytics', cliente: todas.cliente, items: todas.items, emitidoEm: new Date() }
    const arquivo = criarPdfDebitos(comprovante)
    dados.value = comprovante; pdf.value = arquivo
  } catch (e) { if (atual === pedido) erro.value = e instanceof Error ? e.message : 'Não foi possível preparar o comprovante.' }
  finally { if (atual === pedido) carregando.value = false }
}
watch(() => [props.open, props.cliente?.id, JSON.stringify(props.query)], () => {
  pedido++
  if (props.open) void carregar()
  else { dados.value = null; pdf.value = null; aviso.value = ''; erro.value = ''; compartilhando.value = false; carregando.value = false }
}, { immediate: true })
onUnmounted(() => { pedido++ })
function salvar() {
  if (dados.value && pdf.value) baixarPdfDebitos(pdf.value, nomeArquivoDebitos(dados.value))
}
function imprimir() {
  if (!dados.value) return
  try { imprimirDebitos(dados.value) } catch (e) { erro.value = e instanceof Error ? e.message : 'Não foi possível abrir a impressão.' }
}
async function whatsapp() {
  if (!dados.value || !pdf.value || compartilhando.value) return
  erro.value = ''; aviso.value = ''
  const arquivo = new File([pdf.value], nomeArquivoDebitos(dados.value), { type: 'application/pdf' })
  const mensagem = 'Segue o comprovante das parcelas em aberto de ' + dados.value.cliente.nome + '.'
  if (navigator.canShare?.({ files: [arquivo] }) && navigator.share) {
    compartilhando.value = true
    try { await navigator.share({ files: [arquivo], title: 'Débitos do cliente', text: mensagem }) }
    catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) erro.value = 'Não foi possível compartilhar. Use Salvar PDF e anexe o arquivo no WhatsApp.' }
    finally { compartilhando.value = false }
  } else {
    // Nenhum débito é colocado na URL e nenhuma mensagem é enviada automaticamente.
    const janela = window.open('https://wa.me/', '_blank', 'noopener,noreferrer')
    void janela
    salvar()
    aviso.value = 'PDF baixado. Escolha a conversa no WhatsApp e anexe o arquivo. Se o WhatsApp não abrir, acesse-o normalmente.'
  }
}
</script>
<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-[60] bg-ink/50" />
      <DialogContent class="fixed left-1/2 top-1/2 z-[70] max-h-[92vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card bg-surface p-5 shadow-xl">
        <div class="flex items-center justify-between gap-3">
          <DialogTitle class="text-lg font-bold text-ink">Imprimir débitos do cliente</DialogTitle>
          <DialogClose aria-label="Fechar impressão" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn hover:bg-surface-bg"><i class="bi bi-x-lg" /></DialogClose>
        </div>
        <DialogDescription class="mt-1 text-sm text-ink-muted">Comprovante compacto para papel térmico de 80 mm, com todas as parcelas em aberto.</DialogDescription>
        <p v-if="carregando" role="status" class="py-8 text-center text-sm text-ink-muted">Preparando todas as parcelas…</p>
        <p v-if="erro" role="alert" class="mt-4 text-sm text-danger-700">{{ erro }}</p>
        <BaseButton v-if="erro && !dados" class="mt-3" variant="secondary" @click="carregar">Tentar novamente</BaseButton>
        <template v-if="dados && pdf">
          <div class="sticky top-0 z-10 -mx-1 mt-4 flex flex-wrap gap-2 bg-surface px-1 py-3">
            <BaseButton icon="bi-file-earmark-pdf" variant="secondary" @click="salvar">Salvar PDF</BaseButton>
            <BaseButton icon="bi-whatsapp" variant="secondary" :disabled="compartilhando" @click="whatsapp">WhatsApp</BaseButton>
            <BaseButton icon="bi-printer" @click="imprimir">Imprimir</BaseButton>
          </div>
          <p class="mb-3 text-xs text-ink-muted">Na impressão: papel de 80 mm contínuo, escala 100%, margens Nenhuma e desative Cabeçalhos e rodapés. Para compartilhar, escolha o WhatsApp no menu do aparelho.</p>
          <p v-if="aviso" role="status" class="mb-3 rounded-btn bg-brand-50 p-3 text-sm text-ink">{{ aviso }}</p>
          <div class="flex justify-center rounded-btn bg-surface-bg p-3" aria-label="Prévia do comprovante">
            <div class="w-[80mm] max-w-full space-y-3 border border-surface-border bg-white text-black shadow-sm" v-html="previa" />
          </div>
        </template>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
