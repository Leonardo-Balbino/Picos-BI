# Lucro bruto e custos reais — 09/10/2026

## Comportamento

A Visão Geral ganhou dois cartões após os indicadores principais: Lucro bruto (com margem) e Custo total das vendas. Os valores somam as vendas efetivas no período, empresa e caixa autorizados. Não foi criado outro resumo de faturamento.

Lucro bruto = total das vendas efetivas menos custo dos itens vendidos. Não representa lucro líquido após despesas operacionais.

## Origem confirmada

A rota GET /documento/v1 retorna mercadoriasLista[].documentoMercadoriaCustoLista como irmã de documentoMercadoria. O diagnóstico anterior examinou os campos de documentoMercadoria e não identificou essa lista; a conclusão de ausência de custo foi corrigida.

Custo do documento = soma de documentoMercadoria.qtd × documentoMercadoriaCustoLista[0].valCusto. valCustoMedio é alternativa, não parcela adicional. Arredondamento monetário por documento. Zero explicitamente retornado é aceito; lista ausente, inválida ou ambígua não vira zero.

O custo é persistido em Venda.custoTotal (Decimal nullable). Havendo alguma venda efetiva sem custo completo, custo, lucro e margem do período são indisponíveis e a quantidade sem custo é informada. A estimativa antiga de 35% deixou de ser usada no resumo.

Pré-vendas PV/PP com valor positivo foram encontradas no histórico. A regra central as exclui na leitura e na contagem dos vendedores; os documentos permanecem no banco. Recebimentos TR continuam disponíveis para o resumo financeiro, conforme regra existente. Chaves novas de cache evitam servir o resumo antigo.

## Validação

90 testes passaram em 13 suítes após a correção das pré-vendas; build Nest aprovado. Frontend: vue-tsc e Vite aprovados localmente e na Vercel.

Conferência real da Poliana em 09/10, antes de novas vendas: 33 vendas, faturamento R$ 3.261,51, custos R$ 1.518,36, lucro bruto R$ 1.743,15, margem 53,45%. A venda adicional de R$ 44,00/custo R$ 20,28 explica a diferença em relação à captura enviada pelo usuário, que mostrava 32 vendas.

Captura publicada: bi-lucro-custo-real-20261009.png na pasta de visualizações da conversa.

## Publicação

Frontend Vercel: a3Cgh7jcNkXFYgaXNQSwjWY9yPsw.
Release: https://picos-ilpmz9pxs-leonardo-balbinos-projects.vercel.app.
Domínio principal: https://bi.picoserp.app. Demais aliases preservados.

Backend inicial: isv-picos-bi:lucro-real-20261009, baseado em isv-picos-bi:sync-10min-20261009.
Correção final publicada e saudável: isv-picos-bi:lucro-real-v2-20261009.
Migration: 20261009160000_custo_real_venda, apenas coluna nullable.
Backup: /var/backups/interserver/manual/picos-bi-lucro-real-20261009T150831Z.
Dump: 1.108.748 bytes; SHA256 59db26ecf8d57d192031aba6a8879f5ded07f7162b4fbf663f508cfaf56e8d5a, índice pg_restore validado.

O importador histórico altera somente custoTotal em documentos existentes, usa o cliente com limitação de requisições e o mesmo lock Redis da sincronização. A sincronização regular de vendas mantém 10 minutos; estoque/recebíveis mantêm minutos 5,15,25,35,45,55.

Rollback de aplicação: imagem anterior preservada; coluna aditiva pode permanecer. Não remover a coluna nem apagar documentos para reverter a interface.

## Cobertura histórica

Importação concluída às 12:27 de São Paulo: 43 semanas consultadas e 6.293 atualizações de custo (inclui documentos inelegíveis preservados). Não foi criado nenhum documento novo.

Conferência final em produção às 12:28:
- Poliana, dia: 34 vendas, R$ 3.266,51 de faturamento, R$ 1.520,86 de custos, R$ 1.745,65 de lucro bruto; nenhuma venda sem custo.
- Poliana, mês: 541 vendas, R$ 66.468,71 de faturamento, R$ 33.103,51 de custos, R$ 33.365,20 de lucro bruto; nenhuma venda sem custo.
- Poliana, janela de 1 ano: 2.264 vendas, R$ 492.778,61 de faturamento, R$ 237.801,09 de custos, R$ 254.977,52 de lucro bruto; nenhuma venda sem custo.
- Açaí: 2.641 vendas PA no histórico não têm lista de custo retornada pelo ERP (136 no mês); valores de lucro/custo desses períodos ficam indisponíveis. As 3.986 notas modelo 65 retornam custo explicitamente zero. Não foi inventado custo para suprir a origem.

As três consultas autenticadas da Poliana foram comparadas com somas independentes do banco e passaram. Evidência completa: tmp/picos-bi-lucro-real-20261009/verificacao-final.json. Novas vendas ocorreram durante a conferência, por isso os totais finais diferem da primeira captura.

A exclusão de pré-vendas positivas retira 317 documentos PV do mês naquela seleção; o faturamento mensal anterior incluía esses documentos. A solicitação anterior de não considerar pré-vendas fundamenta a correção. Os registros continuam armazenados.
