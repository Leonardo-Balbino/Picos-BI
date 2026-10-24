import { Module } from '@nestjs/common'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { envValidationSchema } from './config/env.validation'
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from './redis/redis.module'
import { ApiKeyGuard } from './common/guards/api-key.guard'
import { LogRedactionInterceptor } from './common/interceptors/log-redaction.interceptor'
import { VendasModule } from './vendas/vendas.module'
import { ItensVendidosModule } from './itens-vendidos/itens-vendidos.module'
import { ComissoesModule } from './comissoes/comissoes.module'
import { ProdutosModule } from './produtos/produtos.module'
import { ClientesModule } from './clientes/clientes.module'
import { FormasPagamentoModule } from './formas-pagamento/formas-pagamento.module'
import { EstoqueModule } from './estoque/estoque.module'
import { EmpresaModule } from './empresa/empresa.module'
import { ContasPendentesModule } from './contas-pendentes/contas-pendentes.module'
import { SyncModule } from './sync/sync.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './auth/auth.module'
import { LojasModule } from './lojas/lojas.module'

@Module({
  imports: [
    // `isGlobal: true` evita reimportar `ConfigModule` em cada módulo de domínio (mesmo
    // espírito de `PrismaModule`, seção 3 do documento de padrões). `validationSchema` faz o
    // processo recusar subir se faltar env obrigatória (seção 8).
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    VendasModule,
    ItensVendidosModule,
    ComissoesModule,
    ProdutosModule,
    ClientesModule,
    FormasPagamentoModule,
    EstoqueModule,
    EmpresaModule,
    ContasPendentesModule,
    SyncModule,
    HealthModule,
    AuthModule,
    LojasModule,
  ],
  providers: [
    // Guard global, fechado por padrão (seção 5 do documento de padrões) — registrado uma vez
    // aqui, nunca `@UseGuards` repetido em cada controller.
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    // Trace de requisição/resposta em nível debug, com redação por lista de permissão
    // (ver log-redaction.interceptor.ts) — mesmo padrão do Picos-gestao-back.
    { provide: APP_INTERCEPTOR, useClass: LogRedactionInterceptor },
  ],
})
export class AppModule {}
