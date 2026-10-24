import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { SyncService } from './sync.service'

/**
 * `npm run backfill` — popula a janela histórica na primeira subida do backend
 * ou sob demanda para uma loja específica:
 *   npm run backfill
 *   npm run backfill -- --loja <idOuCodigo>
 */
async function main(): Promise<void> {
  const logger = new Logger('Backfill')
  const args = process.argv.slice(2)
  let idLojaAlvo: string | undefined

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--loja' && args[i + 1]) {
      idLojaAlvo = args[i + 1]
      i++
    } else if (args[i].startsWith('--loja=')) {
      idLojaAlvo = args[i].split('=')[1]
    }
  }

  const app = await NestFactory.createApplicationContext(AppModule)
  const syncService = app.get(SyncService)

  if (idLojaAlvo) {
    logger.log(`Iniciando backfill direcionado para a loja: "${idLojaAlvo}"`)
  } else {
    logger.log('Iniciando backfill para todas as lojas ativas configuradas.')
  }

  logger.log('Sincronizando entidades de estado corrente (produtos, clientes, estoque, formas de pagamento)...')
  const resultadoSnapshots = await syncService.sincronizarSnapshots(idLojaAlvo)

  logger.log('Preenchendo a janela de dados temporais (vendas, itens vendidos, comissões)...')
  const resultadoJanela = await syncService.sincronizarJanela(idLojaAlvo)

  const totalSucessos = resultadoSnapshots.totalSucessos + resultadoJanela.totalSucessos
  const totalFalhas = resultadoSnapshots.totalFalhas + resultadoJanela.totalFalhas
  const lojasSincronizadas = Array.from(
    new Set([...resultadoSnapshots.lojasSincronizadas, ...resultadoJanela.lojasSincronizadas]),
  )
  const lojasIgnoradas = Array.from(
    new Set([...resultadoSnapshots.lojasIgnoradasSemToken, ...resultadoJanela.lojasIgnoradasSemToken]),
  )

  logger.log('--------------------------------------------------')
  logger.log('RESUMO DA EXECUÇÃO DO BACKFILL:')
  logger.log(
    `  - Lojas com credencial sincronizadas: ${lojasSincronizadas.length > 0 ? lojasSincronizadas.join(', ') : 'Nenhuma'}`,
  )
  if (lojasIgnoradas.length > 0) {
    logger.warn(`  - Lojas IGNORADAS por falta de credencial (sem erpToken): ${lojasIgnoradas.join(', ')}`)
  }
  logger.log(`  - Total de operações bem-sucedidas: ${totalSucessos}`)
  logger.log(`  - Total de falhas registradas: ${totalFalhas}`)
  logger.log('--------------------------------------------------')

  if (lojasSincronizadas.length === 0 && lojasIgnoradas.length > 0) {
    logger.warn(
      'Nenhuma sincronização foi executada: todas as lojas selecionadas estão sem erpToken configurado. Zero requisições enviadas ao ERP.',
    )
  } else if (totalFalhas > 0 && totalSucessos === 0) {
    logger.error('Backfill FALHOU: todas as tentativas de sincronização retornaram erro.')
    process.exitCode = 1
  } else if (totalFalhas > 0) {
    logger.warn(
      `Backfill CONCLUÍDO COM AVISOS: ${totalSucessos} operações concluídas, mas ocorreram ${totalFalhas} falhas.`,
    )
  } else if (totalSucessos > 0) {
    logger.log(`Backfill CONCLUÍDO COM SUCESSO: ${totalSucessos} operações sincronizadas com êxito.`)
  } else {
    logger.log('Backfill finalizado: base de dados já estava 100% atualizada (nenhum dia pendente).')
  }

  await app.close()
}

main().catch((erro: unknown) => {
  console.error('Backfill falhou catastroficamente:', erro)
  process.exitCode = 1
})
