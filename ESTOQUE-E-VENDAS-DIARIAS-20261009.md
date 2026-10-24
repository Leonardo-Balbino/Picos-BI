# Estoque por local e vendas diárias — 09/10/2026

## Entrega

- Analítico de Vendas removido da tela e suas consultas automáticas eliminadas. Vendedores, gráficos e pagamentos preservados. Exportação da tela Vendas passou a Dia e Total vendido, usando o resumo já carregado.
- Participação das unidades, na Visão Geral, substituída por Total vendido por dia. Uma série monetária, sem quantidade, participação ou ticket. Datas sem vendas aparecem com zero. O período e a seleção de empresa/PDV são os mesmos dos indicadores.
- O gráfico diário usa a série diária existente no backend. Para essa visualização não agrupa semanas, mesmo em períodos longos. Outros gráficos conservam sua otimização de períodos longos.
- Estoque mostra Produto, Saldo · Loja, Saldo · Fábrica, Total e Detalhes. Outros clientes recebem seus próprios locais cadastrados. No celular cada cartão mostra o saldo de cada local e o total.
- Produtos ativos ordenados por nome, deixando de priorizar rupturas na lista simplificada.

## Diagnóstico verificado

A importação da Poliana já trazia dois locais ativos: 1 = Loja e 2 = Fabrica. O ciclo de 09/10 às 10:05 (São Paulo) estava concluído com 21 saldos. A API retornou 20 registros na Loja e um na Fábrica. A lista anterior colocava rupturas primeiro, e a captura anterior mostrava apenas itens zerados no topo. Na inspeção atual havia saldos positivos no banco e no ERP; não foi necessário modificar a sincronização.

Exemplos no snapshot: Água de Coco 300ml = 817 na Loja; Água de Coco 1L = 238 na Loja; Maçã Verde = 0 na Loja, 10 na Fábrica, total 10. São snapshots sujeitos às próximas movimentações do ERP.

## Contrato e regra de quantidade

GET /api/v1/estoque/urgencia ganhou o campo opcional locais, com id, descrição e idLoja dos locais ativos no escopo autorizado. Os campos anteriores foram preservados. O frontend tem fallback para servidores anteriores.

As colunas usam estoque físico, como a referência do ERP. Total = soma dos saldos físicos informados por local, mantendo o saldo reservado/disponível nos detalhes. Ausência de registro por produto/local é exibida como Não informado, e não como zero. Total é a soma dos saldos conhecidos; quando nenhum local possui registro, também aparece Não informado. A Fábrica tem coluna mesmo quando não retorna registro daquele produto. O BI não cria movimentos nem supõe estoque na Fábrica.

## Segurança, dados e desempenho

Não houve migrations, alterações em dados comerciais, operações no ERP ou mudanças de permissões. Todos os reads são do PostgreSQL da VPS, via backend. A API externa só continua sendo usada pela sincronização existente. A inspeção externa foi somente leitura e limitada a uma página de locais e uma página de cada local, com intervalo entre chamadas.

O catálogo usa a mesma restrição por empresa do estoque, incluindo os testes de acesso negado e sem lojas autorizadas. A publicação utilizou trava compartilhada com a sincronização, mudança isolada da imagem do BI, health check e rollback automático em caso de falha.

## Validação e publicação

- 12 suítes / 72 testes backend aprovados, incluindo soma de dois locais, reservas, saldo ausente versus zero, isolamento de empresas e autorização.
- Nest build, vue-tsc e Vite build aprovados.
- HTTP autenticado validou Poliana e Açaí Senses: catálogo e produtos pertencem ao escopo; total físico coincide com os locais e soma dos dias coincide com o faturamento do período.
- Evidências: tmp/picos-bi-estoque-diario-20261009/verification.json (sem credenciais).
- Backend saudável: isv-picos-bi:estoque-locais-20261009.
- Imagem anterior para rollback: isv-picos-bi:pagamentos-nomes-20261008.
- Release remoto: /opt/interserver/releases/picos-bi-estoque-locais-20261009.
- Frontend Vercel: F3TjYmGRmB3JvZFQHWmUe3qgTnoQ, aliases existentes preservados.
- Originais dos arquivos alterados em tmp/picos-bi-estoque-diario-20261009/source-before.

Validação visual em produção: mês atual exibiu 01/10 a 09/10, com zeros em 03 e 04/10 e apenas uma série Total vendido. Analítico de Vendas ausente e vendedores/pagamentos preservados. Estoque validado no desktop e em 390 × 844: Loja, Fábrica e Total disponíveis em todos os cartões; override de viewport restaurado ao concluir. Capturas salvas em bi-estoque-loja-fabrica-20261009.png e bi-total-vendido-dia-20261009.png na pasta de visualizações desta conversa.

## Revisão visual solicitada — zero na lista (09/10/2026)

Na lista desktop e nos cartões mobile, ausência de saldo por local ou total passou a aparecer como 0, conforme solicitação do cliente. Cabeçalhos simplificados para o nome do local: Loja / Fabrica. Essa apresentação substitui a orientação anterior de mostrar Não informado na lista. O backend, os dados armazenados, o cálculo e a distinção entre ausência de registro e saldo real zero permanecem intactos; os detalhes continuam mostrando os dados disponíveis. Publicação frontend: CTUdzadwps3kDgxLajiiT7nko1hc, com TypeScript e build de produção.

## Contas a receber — simplificação do cabeçalho (09/10/2026)

Retirados o subtítulo explicativo e o aviso de atualização operacional, conforme marcações da imagem. Indicadores, seleção de empresa, atualização manual/automática, dados e parcelas preservados. Apenas frontend. Publicação Vercel: HA3HacG6ypei9zQExTx7nGECQYCA.

## Detalhes do estoque — legendas simplificadas (09/10/2026)

Removidas visualmente as três linhas marcadas: subtítulo do modal, empresa/unidade abaixo do produto e mínimo do ERP. Descrição acessível do diálogo preservada para leitores de tela. Nome do produto, físico, reservado, disponível e saldos dos locais preservados. Somente frontend; publicação EKYnxPtYxpJQ89dSNdaE48U6bwaK, validada com TypeScript e build de produção.
