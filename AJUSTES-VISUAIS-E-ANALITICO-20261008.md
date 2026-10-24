# BI — layout da Poliana e documentos comerciais — 08/10/2026

## Interface

Na seleção exclusiva de Água de Coco e Gelo Poliana, os links Produtos, Vendedores e Pagamentos ficam ocultos nos menus desktop e mobile. Pagamentos é mostrado dentro de Vendas, após o quadro de vendedores. A página reutiliza o mesmo componente de distribuição, resumo e detalhamento da página independente de Pagamentos; não registra outra exportação nem adiciona chamadas ao ERP.

A condição usa o ID persistente da empresa ca1a1a30-3666-4c0f-9b68-888675b91494, associado às empresas autorizadas e selecionadas. O login restrito à Poliana aplica o layout desde o início da sessão. O administrador aplica esse layout quando seleciona apenas a Poliana. Seleções consolidadas e a Açaí Senses mantêm o menu normal e a página independente de Pagamentos. Ocultar menu não altera permissões nem remove rotas; o backend continua validando o escopo.

Na Visão Geral, os subcartões Vendas elegíveis e Ticket médio foram retirados do cartão roxo de destaque. Os indicadores correspondentes permanecem nos cartões principais. O atalho Ver pagamentos aponta para Vendas na Poliana.

Em Vendas por vendedor, a empresa não aparece mais abaixo do nome. Foi incluída a coluna Ticket médio: total dos itens atribuídos ao vendedor dividido pelo número de documentos em que participou. A divisão por zero é protegida. A contagem continua sendo de documentos, não unidades de produto. IDs de pessoas continuam separados por empresa no backend, mesmo sem mostrar o nome da empresa na linha.

Essas duas simplificações de cards/vendedores estão disponíveis no frontend compartilhado; a alteração do menu e a inclusão dos pagamentos são exclusivas da seleção Poliana.

## Diagnóstico e correção dos documentos zerados

Consulta somente leitura na VPS confirmou que os documentos 325, 324 e 323 de 08/10/2026 são do modelo TR, Recebimento de Conta (PDV), com valTotal zero. Não são do modelo PV. A Poliana tinha 48 documentos PV (Pré-Venda) com tipoMovimentoFinanceiro N, que já eram excluídos na consulta existente.

GET /vendas/pagina agora exclui modelos PV, PP e TR, além de valores não finitos ou não positivos, antes de contar, ordenar e paginar. Assim, o total de páginas também é corrigido. A exportação de Vendas aplica a mesma condição, além dos filtros de período, empresa, PDV e busca já existentes. Vendas comerciais a prazo com valor positivo são preservadas, mesmo sem pagamento associado no documento.

Nenhum documento foi apagado. O sincronizador e a fonte financeira continuam armazenando e lendo os registros necessários. Não houve alteração do schema, migration, calendário de sincronização ou conexão com o ERP.

## Limites preservados da tela de pagamentos

O quadro movido preserva a regra financeira anterior, que inclui pagamentos ligados a recebimentos de contas. Seu total pode superar o faturamento comercial do dia: recebimento de dívida anterior não é uma nova venda. Não foi introduzido rateio nem descarte de recebimentos.

Na conferência da Poliana, algumas formas apareceram por código numérico. A dimensão salva usa códigos prefixados por empresa, enquanto pagamentos dos documentos guardam o código do ERP; esse vínculo de nomes existente deve ser revisado em ajuste próprio. Os valores não foram substituídos nem adivinhados. Esta publicação não altera a regra de distribuição financeira. A denominação existente “% Faturamento” corresponde atualmente à participação no total de pagamentos, não à divisão pelo faturamento comercial; esse texto também merece revisão junto dessa regra.

## Validação e deploy

Build TypeScript/Vue/Vite e Nest aprovados. 70 testes em 12 suites passaram. Os dois novos testes verificam exclusão antes da paginação/contagem, preservação de vendas a prazo e manutenção dos recebimentos na fonte financeira.

Conferência autenticada na API de produção em 08/10/2026:
- Poliana: 61 vendas, R$ 7.860,00; total da tabela igual à quantidade do KPI; documentos TR/PV/PP e valores zero ausentes.
- Açaí Senses: 19 vendas, R$ 374,88; total da tabela igual à quantidade do KPI.
- Nas duas empresas, os totais atribuídos aos vendedores bateram com os indicadores de faturamento nessa consulta.

Esses valores são a fotografia da conferência; novas sincronizações poderão alterá-los. Interface em produção conferida com os dois logins: Poliana com menu reduzido e pagamentos dentro de Vendas; Açaí com os três links e página independente preservados; ticket médio por vendedor presente; cartões duplicados ausentes. A exportação foi revisada no código; não houve validação concluída de um CSV baixado pelo navegador.

Backend saudável: isv-picos-bi:layout-poliana-20261008.
Imagem anterior: isv-picos-bi:vendedores-vendas-20261008.
Release na VPS: /opt/interserver/releases/picos-bi-layout-poliana-20261008.
Foi recriado somente o app do BI, com trava de sincronização durante a troca e configuração anterior protegida com modo 600. Não há migration nesta release.

Frontend Vercel: HDSGRZtZvdMSsZ9Dgo5qwN8GHBm9.
Implantação: https://picos-rgtdir27h-leonardo-balbinos-projects.vercel.app.
Domínio: https://bi.picoserp.app.

## Referências e reversão

Arquivos principais:
- frontend/src/composables/usePolianaLayout.ts
- frontend/src/components/layout/AppSidebar.vue
- frontend/src/components/vendas/PagamentosResumo.vue
- frontend/src/pages/PagamentosPage.vue
- frontend/src/pages/VendasPage.vue
- frontend/src/pages/VisaoGeralPage.vue
- PowerBi-Backend/src/vendas/vendas.service.ts
- PowerBi-Backend/src/vendas/vendas.service.spec.ts

Fontes anteriores, manifesto de release, pacote e resultados HTTP: tmp/picos-bi-layout-poliana-20261008. Para reverter o backend, restaurar APP_IMAGE para a imagem anterior e recriar somente o app do BI. Nenhum rollback de banco é necessário. Para reverter o frontend, promover a implantação anterior ER3pBCnih6srbBQSunTy9LG9Zkka na Vercel.

## Contas a receber — rótulos curtos em 08/10/2026

A tabela agrupada por cliente passou a mostrar os títulos Parcelas, 1º Venc, Total e V. Venc. Foi removido o nome da empresa abaixo do nome de cada cliente. Os nomes dos clientes, quantidades, datas, valores e acesso às parcelas foram preservados. A alteração é somente visual no frontend e também se aplica aos cartões em telas pequenas; não exige migration ou deploy do backend.

Build Vue/TypeScript/Vite aprovado. Frontend Vercel: 2Y54QCLqna5Udhs7dfcu3VQUUoio; URL da implantação: https://picos-euom54g4a-leonardo-balbinos-projects.vercel.app. Fonte anterior em tmp/picos-bi-contas-receber-rotulos-20261008/ContasReceberPage.vue.before.

## Estoque — legenda dos produtos em 08/10/2026

Foi removido o nome da empresa abaixo de cada produto na listagem de Urgência de estoque, tanto na tabela desktop quanto nos cartões mobile. Nomes dos produtos, saldos, filtros e consulta de detalhes foram preservados. Frontend: dBgc8HVG3fwMLPn1T54PgyRbc4ga; implantação https://picos-ejyq2jufn-leonardo-balbinos-projects.vercel.app. Esta versão também inclui os títulos curtos de Contas a receber. Fonte anterior do estoque na mesma pasta tmp/picos-bi-contas-receber-rotulos-20261008.

## Formas de pagamento com nomes e menu Estoque — 08/10/2026

Resolvido o vínculo entre os códigos de pagamento do ERP e os códigos próprios de cada empresa no cadastro de formas. O resumo de vendas agora usa codigoDaLoja para agrupar e identificar as formas de pagamento. O frontend já resolve esses identificadores na dimensão autorizada e mostra os nomes no gráfico, resumo e detalhamento. Os IDs históricos da Açaí/Inhuma permanecem iguais. Códigos numéricos coincidentes de empresas diferentes não são mais somados na mesma linha. O cache do resumo foi versionado para impedir que uma resposta antiga continue exibindo os códigos anteriores.

Nomes da Poliana conferidos no cadastro: PIX BANCO BRASIL, DINHEIRO, A PRAZO, CARTAO CREDITO, PIX SANTANDER e CARTAO DEBITO. Comparação autenticada antes/depois confirmou valores, quantidades de transações e KPIs preservados tanto na Poliana quanto na Açaí. 71 testes em 12 suites e build Nest aprovados. Não houve migration ou alteração de registros do banco.

Backend atual: isv-picos-bi:pagamentos-nomes-20261008, saudável. Imagem anterior: isv-picos-bi:layout-poliana-20261008. Release: /opt/interserver/releases/picos-bi-pagamentos-nomes-20261008. Fontes anteriores, resumo de comparação e resultados: tmp/picos-bi-pagamentos-nomes-20261008. Reversão: restaurar APP_IMAGE para a imagem anterior e recriar somente o app do BI.

O nome do link /estoque no menu desktop e mobile passou de Urgência de estoque para Estoque. Frontend Vercel: 4QPRqExqaTz3pEjJYSDcojGcFu9s; implantação https://picos-rjbpp2ocw-leonardo-balbinos-projects.vercel.app.

A observação anterior sobre formas exibidas por códigos numéricos está resolvida por esta publicação. A regra de valores dos pagamentos, incluindo recebimentos de contas, continua preservada.

### Parcelas do cliente — coluna Documento (08/10/2026)

O cabeçalho `Documento / parcela` passou a `Documento`. A legenda com a empresa do BI foi retirada do resumo do cliente na janela de parcelas. O número da parcela, os valores, vencimentos e acesso aos detalhes foram preservados. Alteração somente no frontend; sem mudanças no banco ou backend. Publicação Vercel: `3zo3fKmH99xDfzKMuUNKdN6cKfRo`, com validação TypeScript e build de produção.

### Tela de Estoque simplificada (08/10/2026)

Título alterado para `Estoque`. Foram retirados o subtítulo, o aviso de atualização operacional, os quatro indicadores, as explicações e os filtros de produto/situação/limite. A lista agora exibe todos os produtos ativos retornados pelo backend para a seleção autorizada, sem restringir silenciosamente aos urgentes. Seleção de empresa, atualização manual/automática, paginação e detalhes preservados. Nenhuma mudança no ERP, banco ou backend. TypeScript e build de produção aprovados. Deployment Vercel: `DLgheJ1Hy9TiUH8MSRMVSoeeAZKd`.

## Filtros globais simplificados — 09/10/2026

Removidos os controles 90 dias, seleção de PDV e Exportar, conforme a imagem enviada. Componente compartilhado FilterControls.vue ajusta tanto desktop quanto o painel de filtros mobile. Permanecem Dia, Semana, Mês atual, Mês anterior, 1 Ano, Personalizado, empresa e Atualizar. A consulta padrão continua abrangendo todos os PDVs. Apenas frontend; sem alteração de dados, backend ou agendamento.

TypeScript e build Vite aprovados. Publicação Vercel EGFM9Domt4txWUMhDU5RiWpQq7Hy (https://picos-eh217y8rx-leonardo-balbinos-projects.vercel.app). Conferência autenticada em bi.picoserp.app/visao-geral confirmou ausência dos três controles. Captura: bi-filtros-simplificados-20261009.png na pasta de visualizações desta conversa.
