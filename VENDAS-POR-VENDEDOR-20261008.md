# Vendas por vendedor no BI — 08/10/2026

## Comportamento

O quadro **Vendas por vendedor** fica dentro da tela **Vendas**, acima do analítico. Mostra vendedor, número de vendas/pedidos e total vendido, ordenado pelo maior valor. Acompanha os mesmos filtros de período, empresa e PDV da tela. A consulta usa o backend da VPS; o navegador não consulta o ERP nem recebe a chave do ERP.

O vendedor vem de documento/v1 → mercadoriasLista → documentoMercadoria → idPessoaFuncionario e nomePessoaFuncionario. O operador nomeUsuario não é tratado como vendedor. O valor vem de valTotalLiquido dos itens atribuídos à pessoa.

Cada documento elegível conta uma vez para cada vendedor que participou dele. Dez itens da mesma pessoa na mesma venda representam uma venda, não dez. Havendo duas pessoas no mesmo documento, cada uma recebe somente o valor de seus itens; a soma das quantidades por vendedor pode superar o número de documentos únicos. Os IDs são separados por loja. Sem identificação do vendedor, os itens aparecem como **Sem vendedor informado**, sem atribuição inventada. Cancelamentos, rascunhos, entradas e valores não positivos seguem a regra de elegibilidade existente.

Diferenças entre valores dos itens e total do documento são mostradas em aviso, sem rateio artificial. Histórico sem metadados gera aviso de cobertura; não é apresentado como zero vendas.

## Armazenamento e sincronização

Migration aditiva **20261008210000_vendedores_por_venda**: coluna nullable JSONB **Venda.vendedores**. Os documentos e seus identificadores são preservados; não foram criadas vendas artificiais. O JSON guarda apenas código, nome e valor agrupados por vendedor. Null significa documento ainda não detalhado. Array vazio significa ERP sem vínculo útil; a leitura identifica essa situação separadamente.

O sincronizador de vendas existente passa a guardar esses metadados no mesmo upsert da venda. Não acrescenta chamadas ao ERP durante o ciclo normal. Repetir a sincronização substitui os metadados da mesma venda, sem duplicar a contagem. Se mercadoriasLista estiver ausente do payload, os metadados anteriores não são apagados.

Foi concluído o detalhamento de **01 a 08/10/2026** para Poliana e Açaí Senses. Na Açaí, o token padrão do backend é utilizado quando Loja.erpToken está vazio, mantendo o comportamento do sincronizador existente. Leituras manuais usaram a mesma trava Redis e a fila de até 18 requisições por minuto. Metadados mais antigos ainda não reimportados continuam sinalizados pela interface; não houve reimportação da janela inteira de 365 dias.

## Contrato

GET /api/v1/vendas/vendedores
Parâmetros: inicio, fim, idsLojas e idCaixa.
Resposta: items com codigo, idLoja, nome, nomeLoja, quantidadeVendas e totalVendido; mais vendasAnalisadas, vendasSemDetalhamento, totalVendas, valorSemDetalhamento, totalAtribuido e diferencaItens.

O escopo das lojas é validado antes do acesso ao banco. O cache Redis usa a geração de vendas, o intervalo, lojas autorizadas e caixa. Troca de filtros no frontend cancela a consulta anterior e limpa os valores para impedir exibição de resposta fora do escopo atual. Navegar para outra tela cancela a consulta pendente.

## Validação

Build Nest, Prisma e frontend aprovados. **68 testes passaram em 12 suites**, incluindo dez casos de deduplicação por documento, dois vendedores na mesma venda, ausência de identificação, status inválidos, valores monetários, histórico sem metadados, IDs iguais em empresas diferentes e autorização antes da consulta.

Em produção: requisição sem autenticação bloqueada (401), tentativa da Poliana de consultar Açaí bloqueada (403), caixa inexistente retorna vazio. Valor e número de vendas foram comparados com o resumo existente tanto para o dia quanto para o mês atual nas duas empresas, sem diferenças. Nenhuma venda elegível do mês ficou sem detalhamento:
- Poliana, hoje: 47 vendas, R$ 6.301,50.
- Poliana, mês: 810 vendas, R$ 106.591,78.
- Açaí Senses, hoje: 8 vendas, R$ 136,79.
- Açaí Senses, mês: 298 vendas, R$ 7.483,02.

Valores conferidos durante a execução; novas vendas poderão alterá-los.

## Publicação e reversão

Backend saudável: isv-picos-bi:vendedores-vendas-20261008.
Digest: sha256:1a1ccf4df6c9495e96a5039016fc05321ad9b1e56865a1a38cdd16c02cc85275.
Imagem anterior: isv-picos-bi:receber-clientes-20261008.
Release na VPS: /opt/interserver/releases/picos-bi-vendedores-vendas-20261008.

Backup anterior à migration: /var/backups/interserver/manual/picos-bi-vendedores-vendas-20261008T203832Z/picos_analytics.dump, 867190 bytes, SHA-256 369a2972c6933447e90121839670d28f6acfae825ed3263942a964ea9f076827. Arquivo protegido com modo 600; índice pg_restore validado. Isso não equivale a teste de restauração completa. A mesma pasta contém picos-bi.env.rollback.

Frontend Vercel: ER3pBCnih6srbBQSunTy9LG9Zkka.
URL da implantação: https://picos-8cxy2ukk6-leonardo-balbinos-projects.vercel.app.
Domínio de uso: https://bi.picoserp.app/vendas.

Para reverter o backend, restaurar APP_IMAGE para a imagem anterior e recriar somente o serviço app do BI. A coluna adicional pode permanecer, sem exclusão de dados. Reverter o quadro do frontend antes ou junto da imagem anterior, pois o endpoint novo não existe na versão anterior. Fontes anteriores em tmp/picos-bi-vendedores-vendas-20261008; os outros sistemas da VPS não foram alterados.
Conferência visual em produção aprovada: a troca de Dia para Mês atual atualizou nomes, quantidades e valores do quadro. Em Poliana, o mês incluiu oito grupos (sete vendedores identificados e um grupo sem vendedor informado), sem diferença financeira com o resumo. A soma das participações foi 812 para 810 documentos únicos, coerente com vendas que tiveram mais de um vendedor.
