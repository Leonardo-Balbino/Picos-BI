'use strict';
require('reflect-metadata');
const assert=require('node:assert/strict');
const {PrismaClient}=require('@prisma/client');
const {Logger}=require('@nestjs/common');Logger.overrideLogger(false);
const {ProdutosService}=require('../../dist/produtos/produtos.service');
const {ClientesService}=require('../../dist/clientes/clientes.service');
const {FormasPagamentoService}=require('../../dist/formas-pagamento/formas-pagamento.service');
const {EstoqueService}=require('../../dist/estoque/estoque.service');
const {ContasPendentesService}=require('../../dist/contas-pendentes/contas-pendentes.service');
const {EmpresaService}=require('../../dist/empresa/empresa.service');
const {ItensVendidosService}=require('../../dist/itens-vendidos/itens-vendidos.service');
const {SyncService}=require('../../dist/sync/sync.service');
const db='postgresql://qa:qa-temporario@127.0.0.1:55446/picos_bi_poliana_qa';
const prisma=new PrismaClient({datasources:{db:{url:db}}});
const redis={chaveComGeracao:async(e,s)=>e+':'+s,getOrSet:async(k,f)=>f()};
const config={get:key=>key==='ERP_API_TOKEN'?'QA-A':365};
let chamadas=[];
const upstream={
 get:async(path,params,token)=>{assert.equal(path,'/empresa/v1');chamadas.push({path,token});return {fantasia:token,razaoSocial:'Empresa '+token,cnpjCpf:'00000000000000',municipio:'QA',uf:'SP'};},
 getAllPages:async(path,params,map,token)=>{
  chamadas.push({path,token});
  const n=token==='QA-A'?2:9;
  if(path==='/mercadoria/v1')return [{codigoMercadoriaVariacao:'P1',descricao:'Produto '+token,codigoBarras:'',referenciaMercadoria:'',embalagem:'UN',idMarca:'1',qtdEstoqueMinimo:0,qtdEstoqueMaximo:100,ativo:true}];
  if(path==='/pessoa/v1')return [{codigo:'C1',razaoSocial:'Pessoa '+token,fantasia:token,tipo:'CLIENTE',cnpjCpf:'00000000000000',dataCadastro:'2026-01-01',ativo:true}];
  if(path==='/pagamento/v1')return [{codigo:'F1',descricao:'Pix '+token,idTipo:'1',tipoDescricao:'Pix',aVista:true,ativo:true}];
  if(path==='/local-estoque/v1')return [{codigo:'L1',descricao:'Local '+token,ativo:true}];
  if(path==='/local-estoque/L1/estoques/v1')return [{idMercadoriaVariacao:'P1',qtdSaldo:n,qtdSaldoReserva:0,dataHora:'2026-01-01T12:00:00'}];
  if(path==='/conta-receber/pendentes/v1')return [{idDocumento:'D1',numero:'1',nome:'Conta '+token,descricao:'QA',dtLancamento:new Date('2026-01-01'),dtVencimento:new Date('2026-01-02'),dtPagamento:null,valOrigem:n,valPago:0,valDesconto:0,valSaldo:n,status:'PENDENTE'}];
  if(path==='/documento/mercadorias-vendidas/v1')return [{idMercadoriaVariacao:'P1',descricao:'Produto '+token,qtd:n,valTotalLiquido:n*10}];
  throw Error('Endpoint inesperado: '+path);
 }
};
(async()=>{
 const actual=await prisma.$queryRawUnsafe('SELECT current_database() AS name');
 assert.equal(actual[0].name,'picos_bi_poliana_qa');
 await prisma.organizacao.create({data:{id:'org-qa',nome:'Organização QA',codigo:'org-qa'}});
 for(const id of ['loja-inhuma','loja-qa-b'])await prisma.loja.create({data:{id,idOrganizacao:'org-qa',nome:id,codigo:id}});
 const produtos=new ProdutosService(prisma,upstream);
 const clientes=new ClientesService(prisma,upstream);
 const pagamentos=new FormasPagamentoService(prisma,upstream);
 const estoque=new EstoqueService(prisma,redis,upstream);
 const contas=new ContasPendentesService(prisma,upstream);
 const empresa=new EmpresaService(prisma,upstream);
 const vendidos=new ItensVendidosService(prisma,redis,upstream,config);
 for(const [id,token] of [['loja-inhuma','QA-A'],['loja-qa-b','QA-B']]){
  await produtos.sincronizarSnapshot(id,token);
  await clientes.sincronizarSnapshot(id,token);
  await pagamentos.sincronizarSnapshot(id,token);
  await estoque.sincronizarSnapshot(id,token);
  await contas.sincronizarSnapshot('RECEBER',id,token);
  await empresa.sincronizarSnapshot(id,token);
  await vendidos.sincronizarDia(new Date('2026-01-01'),id,token);
 }
 for(const model of ['produto','pessoa','formaPagamentoDim','localEstoque','saldoEstoque','contaPendente','empresa','itemVendidoDia'])assert.equal(await prisma[model].count(),2,model+' sem colisão');
 assert.equal((await prisma.produto.findUniqueOrThrow({where:{codigoMercadoriaVariacao:'P1'}})).descricao,'Produto QA-A');
 assert.equal((await prisma.produto.findUniqueOrThrow({where:{codigoMercadoriaVariacao:'loja-qa-b_P1'}})).descricao,'Produto QA-B');
 assert.equal(Number((await prisma.saldoEstoque.findFirstOrThrow({where:{idLocal:'L1'}})).qtdSaldo),2);
 assert.equal(Number((await prisma.saldoEstoque.findFirstOrThrow({where:{idLocal:'loja-qa-b_L1'}})).qtdSaldo),9);
 assert.equal((await prisma.saldoEstoque.findFirstOrThrow({where:{idLocal:'loja-qa-b_L1'}})).idMercadoriaVariacao,'loja-qa-b_P1');
 const usuario={sub:'usuario-qa',email:'qa@example.invalid',nome:'QA',perfil:'FRANQUEADO',lojas:['loja-qa-b']};
 assert.equal((await empresa.obter(usuario)).fantasia,'QA-B');
 assert.equal((await empresa.obter()).fantasia,'QA-A');
 await assert.rejects(empresa.obter(usuario,'loja-inhuma'),e=>e.getStatus()===403);
 await assert.rejects(empresa.obter({...usuario,lojas:[]}),e=>e.getStatus()===403);
 const pagina=await produtos.listar({page:1,pageSize:100},usuario);
 assert.equal(pagina.total,1);assert.equal(pagina.items[0].descricao,'Produto QA-B');
 await assert.rejects(produtos.listar({page:1,pageSize:100,idLoja:'loja-inhuma'},usuario),e=>e.getStatus()===403);
 const dia=new Date('2026-01-01');
 await prisma.syncLog.create({data:{entidade:'VENDA',status:'ERRO',idLoja:'loja-inhuma',dataReferencia:dia,erro:'ERRO DE OUTRO CLIENTE'}});
 await prisma.syncLog.create({data:{entidade:'VENDA',status:'SUCESSO',idLoja:'loja-qa-b',dataReferencia:dia,registrosProcessados:1}});
 const noop={sincronizarDia:async()=>0,expirarAntesDe:async()=>0};
 const sync=new SyncService(prisma,redis,config,noop,vendidos,noop,produtos,clientes,pagamentos,estoque,empresa,contas);
 const status=await sync.status(undefined,usuario);
 assert.equal(status.entidades.find(e=>e.entidade==='VENDA').status,'SUCESSO');
 assert(!JSON.stringify(status).includes('ERRO DE OUTRO CLIENTE'));
 await assert.rejects(sync.status('loja-inhuma',usuario),e=>e.getStatus()===403);
 await contas.sincronizarSnapshot('RECEBER','loja-qa-b','QA-B');
 assert.equal((await prisma.contaPendente.findFirstOrThrow({where:{idLoja:'loja-inhuma'}})).aindaPendente,true);
 assert(chamadas.some(c=>c.path==='/empresa/v1'&&c.token==='QA-B'));
 assert(chamadas.filter(c=>c.path.includes('/estoques/')).every(c=>c.path==='/local-estoque/L1/estoques/v1'));
 console.log('QA PostgreSQL aprovado: 8 entidades preservam códigos iguais entre lojas; estoque usa IDs internos e URL ERP original; empresa/produtos/status bloqueiam outra loja; resync não liquida contas alheias.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());

