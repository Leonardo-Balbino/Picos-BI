import { Module } from '@nestjs/common'
import { VendasModule } from '../vendas/vendas.module'
import { ItensVendidosModule } from '../itens-vendidos/itens-vendidos.module'
import { ComissoesModule } from '../comissoes/comissoes.module'
import { ProdutosModule } from '../produtos/produtos.module'
import { ClientesModule } from '../clientes/clientes.module'
import { FormasPagamentoModule } from '../formas-pagamento/formas-pagamento.module'
import { EstoqueModule } from '../estoque/estoque.module'
import { EmpresaModule } from '../empresa/empresa.module'
import { ContasPendentesModule } from '../contas-pendentes/contas-pendentes.module'
import { SyncController } from './sync.controller'
import { SyncService } from './sync.service'

@Module({
  imports: [
    VendasModule,
    ItensVendidosModule,
    ComissoesModule,
    ProdutosModule,
    ClientesModule,
    FormasPagamentoModule,
    EstoqueModule,
    EmpresaModule,
    ContasPendentesModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
