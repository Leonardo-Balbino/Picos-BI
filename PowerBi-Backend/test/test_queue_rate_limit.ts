import 'reflect-metadata'
import { MeuErpOnlineClient } from '../src/upstream/meu-erp-online.client'
import { ConfigService } from '@nestjs/config'

async function runRateLimitSimulation() {
  console.log('=== TESTE DE RATE LIMIT E SERIALIZAÇÃO DE FILA MULTILOJA ===\n')

  const timestamps: { store: string; time: number; deltaMs: number }[] = []
  let previousTime = 0

  // Intercepta fetch global apenas para medir os disparos da fila sem chamar a internet
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const now = Date.now()
    const delta = previousTime ? now - previousTime : 0
    previousTime = now

    const authHeader = (init?.headers as Record<string, string>)?.['Authorization'] || ''
    // Identifica qual loja chamou pelo token mascarado
    const storeLabel = authHeader.includes('token-loja-1') ? 'Loja 1' : 'Loja 2'

    timestamps.push({ store: storeLabel, time: now, deltaMs: delta })

    // Simula tempo de rede de 50ms
    await new Promise((r) => setTimeout(r, 50))

    return new Response(JSON.stringify({ ok: true, items: [], totalPages: 1 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as unknown as typeof fetch

  const config = new ConfigService({
    ERP_API_BASE_URL: 'https://meuerponline.com.br/api',
    ERP_API_TOKEN: 'default-token',
  })

  const client = new MeuErpOnlineClient(config)

  console.log('Disparando 4 requisições SIMULTÂNEAS via Promise.all:')
  console.log('  - Req 1 (Loja 1): get(/empresa/v1)')
  console.log('  - Req 2 (Loja 2): get(/empresa/v1)')
  console.log('  - Req 3 (Loja 1): get(/documento/v1)')
  console.log('  - Req 4 (Loja 2): get(/documento/v1)\n')

  const tInicio = Date.now()

  await Promise.all([
    client.get('/empresa/v1', {}, 'token-loja-1'),
    client.get('/empresa/v1', {}, 'token-loja-2'),
    client.get('/documento/v1', {}, 'token-loja-1'),
    client.get('/documento/v1', {}, 'token-loja-2'),
  ])

  const tFim = Date.now()

  // Restaura fetch
  globalThis.fetch = originalFetch

  console.log('Resultados observados na fila:')
  timestamps.forEach((t, i) => {
    console.log(
      `  [Chamada ${i + 1}] ${t.store.padEnd(8)} - Intervalo desde chamada anterior: ${t.deltaMs} ms ${i === 0 ? '(primeira chamada imediata)' : `(>= 3334 ms: ${t.deltaMs >= 3334 ? 'SIM' : 'NÃO'})`}`
    )
  })

  const duracaoTotalSegundos = (tFim - tInicio) / 1000
  const taxaSustentadaPorMinuto = ((timestamps.length - 1) / duracaoTotalSegundos) * 60

  console.log(`\nDuração total do teste: ${duracaoTotalSegundos.toFixed(2)} segundos`)
  console.log(`Intervalo médio entre chamadas: ${(duracaoTotalSegundos / (timestamps.length - 1)).toFixed(2)} segundos`)
  console.log(`Taxa sustentada observada: ${taxaSustentadaPorMinuto.toFixed(2)} requisições/minuto (limite seguro: <= 18 req/min)`)

  const todosIntervalosOk = timestamps.slice(1).every((t) => t.deltaMs >= 3334)
  if (todosIntervalosOk && taxaSustentadaPorMinuto <= 18.5) {
    console.log('\n✓ SUCESSO: Todas as chamadas respeitaram rigorosamente o espaçamento mínimo de 3.334 ms.')
  } else {
    console.error('\n✗ FALHA: Algum intervalo ficou abaixo de 3.334 ms.')
    process.exitCode = 1
  }
}

runRateLimitSimulation().catch((err) => {
  console.error('Erro na simulação:', err)
  process.exitCode = 1
})
