# BI — urgência de estoque e contas a receber
Data: 08/10/2026. Escopo: somente Picos-BI.
Status: publicado em produção em 08/10/2026, com carga inicial e verificações de integração e HTTP concluídas.

## Fluxo dos dados
MeuERP → sincronizador serial do backend → PostgreSQL da VPS → API autenticada do BI → frontend Vercel.
As telas não consultam o MeuERP diretamente. São consultas ao banco da VPS. Os pagamentos, baixas, cadastros de mínimos e alterações de estoque continuam no ERP.

Vendas continuam com ciclo de 10 minutos. Produto, pessoa, estoque e contas a receber têm ciclo adicional no minuto 05 de cada hora, em America/Sao_Paulo. Os ciclos usam a mesma trava Redis com renovação, fila com espaçamento e tratamento de limites da API. Se outra sincronização estiver em andamento, o ciclo é adiado, sem concorrência. O ciclo diário completo foi preservado. A tela consulta o backend a cada minuto enquanto está visível e mostra a última importação; Atualizar dados não força consulta ao ERP.

## Contas a receber
Menu Contas a receber, rota /contas-a-receber.
Lista somente RECEBER, aindaPendente=true e valSaldo>0, sem limitar por padrão ao período de vendas.
Filtros: nome do cliente (parcial, sem distinção de maiúsculas), valor mínimo/máximo do saldo em aberto, vencimento inicial/final, vencidas, vence hoje, a vencer e pagamento parcial. Ordenação por vencimento, saldo ou cliente; paginação no servidor, 20 por página.
Indicadores somam todo o resultado filtrado, não apenas a página visível.

Ao clicar em Ver conta ou no cliente, aparecem saldo restante, valor original, pago, desconto, vencimento, parcela, empresa e dados cadastrais disponíveis do devedor. O relacionamento usa idPessoa real e a loja; não tenta identificar pessoas pelo nome. Se não houver cadastro local correspondente, mantém o nome que o ERP enviou e informa a ausência dos demais dados.

A API real retornou títulos com status P e saldo zero: esses não representam dívida e foram excluídos do painel. Títulos parcialmente pagos podem ter dtPagamento preenchida; continuam no painel enquanto o saldo for positivo. Quando a próxima importação informa quitação ou remove o título da lista de pendentes, ele deixa o painel.

Origem: GET /conta-receber/pendentes/v1, paginação completa antes da transação.
Colunas adicionais nullable de ContaPendente: idDocumentoErp, idPessoa, idSequencia, idParcela.
Migration: 20261008190000_contas_receber_cliente. Apenas adiciona colunas e índice, sem apagar ou reiniciar a base.
Parcelas diferentes do mesmo documento possuem chave própria. A primeira mantém a chave antiga para atualizar o registro existente. As demais acrescentam sequência e parcela, depois recebem o namespace da loja.

API do BI:
- GET /api/v1/contas-a-receber/pagina: idsLojas, page, pageSize, cliente, valorMin, valorMax, inicio, fim, situacao, ordenar, direcao.
- GET /api/v1/contas-a-receber/:id: detalhe pelo UUID interno.
A rota de listagem anterior foi preservada.

## Urgência de estoque
Menu Urgência de estoque, rota /estoque.
Produtos ativos, com saldo separado por empresa/unidade; soma dos locais ativos da própria unidade.
Disponível = físico − reservado.
RUPTURA: disponível zero ou negativo.
BAIXO: mínimo positivo e disponível menor ou igual ao mínimo.
REGULAR: mínimo positivo e disponível acima dele.
SEM_MINIMO: saldo positivo e mínimo não definido.
SEM_SALDO: nenhum saldo informado; não equivale a saldo zero.

Mostra urgentes inicialmente; permite todos, situação e busca por produto. Detalhe mostra físico, reservado, disponível e locais.
Nas amostras de ambas as empresas, nenhum produto tinha mínimo positivo cadastrado. Por isso, não se inventa um mínimo. O campo Limite de consulta permite avaliar um limite temporário na tela; não grava no ERP nem no banco. Vazio volta ao mínimo do cadastro.

API: GET /api/v1/estoque/urgencia?idsLojas=...&limiteAlerta=...
O resumo de estoque anterior foi preservado.

## Isolamento e proteção
FRANQUEADO recebe apenas suas unidades. Filtro contendo unidade externa retorna 403. Detalhe de conta de outra empresa retorna 404. Administrador global mantém consulta às empresas autorizadas pelo perfil.
Identificadores do ERP permanecem separados por loja. Estoque nunca soma saldos de empresas diferentes para classificar urgência.
Nenhuma chave ERP, senha de banco ou token de login foi colocada no frontend.
As frases técnicas sobre JWT foram removidas do login, sem alteração da autenticação.

## Validação e publicação
58 testes do backend aprovados (11 suites). Compilações Nest, Prisma, TypeScript/Vue e Vite aprovadas.
Teste com PostgreSQL temporário separado: 10 cenários aprovados, incluindo parcelas, quitação, reimportação idempotente, reservas, filtros e isolamento. As três migrations foram aplicadas nesse banco. Contêiner e rede de QA removidos após o teste.
Produção: 30 verificações HTTP aprovadas, incluindo filtros, soma de todas as páginas, identificação do devedor, autenticação, 403/404 entre empresas e validação de parâmetros.
Carga inicial operacional: 8 tarefas com sucesso, 0 falhas, nas duas empresas. Nenhuma escrita no ERP.

Banco após carga inicial:
- Poliana: 274 títulos positivos em aberto, todos com idPessoa, sem duplicação de documento/sequência/parcela; catálogo de 18 produtos ativos.
- Açaí Senses: nenhum título positivo pendente retornado; catálogo de 27 produtos ativos.
- Administrador global: 45 produtos ativos; totais financeiros equivalentes à soma das empresas.
Dados representam a importação/teste de 08/10/2026 aproximadamente 16:12–16:16. Podem mudar conforme o ERP.
Tempos externos observados: listagem financeira de 100 linhas entre 0,57 e 0,95 segundo; estoque entre 0,57 e 0,72 segundo. Incluem rede, não são SLA.

Backup pré-migration: /var/backups/interserver/manual/picos-bi-estoque-receber-20261008T190944Z/picos_analytics.dump, 852.992 bytes, modo 600.
SHA-256: 4d3bbab0ce1fff1a52ec40628bb5aaf91744ff64dfd375bda055170b38955e5c.
Índice do dump validado por pg_restore --list; não foi feita restauração desse dump em uma segunda base nesta entrega. A migration foi testada na base QA antes da produção.
Rollback da configuração no mesmo diretório: picos-bi.env.rollback, modo 600.

Frontend publicado: https://picos-114nm3ncs-leonardo-balbinos-projects.vercel.app, deployment CLeb7HjqkKSCFtRFk1bk5Xo7BQCo.
Domínios preservados: bi.picoserp.app, picoserp.app, www.picoserp.app e picos-bi.vercel.app.
Verificado no navegador: login sem frases JWT, filtros cliente/valor, detalhe do pagamento parcial, catálogo ativo e tela de estoque. Layout do catálogo conferido em 390 × 844.

## Produtos inativos
GET /api/v1/produtos aplica ativo=true tanto na listagem quanto na contagem paginada. Produtos inativos não são enviados ao navegador pelo catálogo e já eram excluídos da tela de urgência.
Registros históricos foram preservados no banco; 3 produtos inativos da Poliana e 2 da Açaí não aparecem no catálogo. Não se apagam produtos que podem referenciar vendas históricas.
A sincronização continua recebendo os estados do ERP para refletir futuras ativações/inativações corretamente.

## Repetir deploy e rollback
1. Compilar backend e frontend, testar e construir uma nova imagem com Prisma Client gerado para a base Linux da VPS.
2. Verificar destino com /opt/interserver/scripts/guard.sh picos-bi.
3. Adquirir trava global de sincronização e realizar backup/configuração antes de migration.
4. Ajustar somente APP_IMAGE de /etc/interserver/picos-bi.env, preservando segredos e as quatro origens CORS.
5. Aplicar migration usando /opt/interserver/scripts/compose.sh picos-bi --profile migration run --rm migrate.
6. Recriar somente app: /opt/interserver/scripts/compose.sh picos-bi up -d --no-deps app.
7. Conferir healthy, liberar a trava pelo proprietário e executar a carga operacional pela própria SyncService quando necessário, sem subir uma segunda aplicação com cron.
8. Publicar frontend no projeto Vercel picos-bi e verificar os domínios, o acesso por empresa e os filtros.
Não executar down -v nem recriar PostgreSQL, Redis ou aplicações dos outros clientes.

Imagem final: isv-picos-bi:estoque-receber-ativos-20261008, digest 25c49481e39bf1b6d28339b013ba9b6fc03af3aba32823c11ec5d2f9f1f7990b.
Configuração anterior ao filtro de ativos: /var/backups/interserver/manual/picos-bi-produtos-ativos-20261008T191337Z/picos-bi.env.rollback.
Para reverter somente o filtro, voltar à imagem estoque-receber-20261008. Para reverter toda a entrega, voltar à poliana-20261008. As colunas nullable são compatíveis e devem ser preservadas. Uma reversão completa também exige republicar o frontend anterior, para não manter menus cujas rotas não existem no backend.
A pasta tmp/picos-bi-estoque-receber-20261008 contém os arquivos anteriores alterados, scripts, manifests e resultados de validação. Não contém tokens ERP nem dump de produção.


Imagem anterior: isv-picos-bi:poliana-20261008.
Imagem candidata: isv-picos-bi:estoque-receber-20261008.
Em caso de falha de saúde após publicação, voltar a APP_IMAGE anterior e recriar somente app. Não remover as colunas adicionadas, pois são compatíveis. Não usar imagem anterior à inclusão de Poliana.


## Ajuste posterior — dívidas agrupadas por cliente
Backend e frontend publicados e conferidos em 08/10/2026. Backend aproximadamente 16:55; frontend aproximadamente 17:00.
A lista principal agora representa um cliente por empresa, usando idLoja e idPessoa reais. Clientes sem idPessoa não são agrupados apenas pelo nome: cada título sem identificação fica separado para evitar atribuir dívida a outra pessoa.
Nome de exibição: fantasia não vazia → razão social → nome informado na conta. O detalhe preserva razão social e demais dados cadastrais. A busca aceita nome fantasia, razão social ou nome original da conta.

Filtros de vencimento e situação selecionam parcelas; em seguida o backend agrupa e aplica valor mínimo/máximo sobre o saldo total do cliente. Ordenação e paginação são aplicadas depois do agrupamento. A tela deixa explícito “Total mínimo/máximo por cliente”.
Ao clicar em um cliente/Ver parcelas, abre a lista paginada de parcelas em aberto e o total do cliente nos filtros atuais. Os filtros de valor não são reaplicados individualmente às parcelas. Cada parcela mantém Ver detalhes, mostrando original, pago, desconto, vencimento e saldo.
A soma das parcelas é igual ao total exibido do cliente. Pagamento parcial não é excluído enquanto existir saldo positivo. A referência do cliente continua funcionando quando a parcela usada como identificador foi quitada desde a abertura da tela, desde que as demais parcelas ainda existam.

Novos endpoints:
- GET /api/v1/contas-a-receber/clientes — agrupamento e filtros.
- GET /api/v1/contas-a-receber/clientes/:id/parcelas — id de um título identificador autorizado, mesmas regras de vencimento/situação e paginação própria.
Endpoints anteriores preservados. Nenhuma migration ou alteração de registros de produção nesta entrega. Consultas PostgreSQL parametrizadas com Prisma.sql e joins por código/empresa; nenhuma chamada ao ERP ao abrir grupos ou parcelas.

Validação: 17 cenários de integração em banco temporário separados da produção, incluindo regras anteriores e sete cenários do agrupamento; 24 verificações HTTP em produção aprovadas. Na conferência, Poliana apresentou 101 clientes, preservando a quantidade de títulos e os saldos do painel anterior. As compilações backend, Vue/TypeScript e Vite passaram.

Imagem atual: isv-picos-bi:receber-clientes-20261008.
Digest: 9a2c5935881cf58193655d9159b7845cbcc7af4b94ea0a7e06ae30b42e5719fb.
Backup da configuração: /var/backups/interserver/manual/picos-bi-receber-clientes-20261008T195536Z/picos-bi.env.rollback (600).
Rollback desta mudança: voltar APP_IMAGE para isv-picos-bi:estoque-receber-ativos-20261008 e recriar somente app; republicar também o frontend anterior BACuTqzaqg5YeYyoA6ytrMDt4XiD.
Fontes anteriores e testes: tmp/picos-bi-receber-clientes-20261008.

Frontend do agrupamento: https://picos-5ilnanenj-leonardo-balbinos-projects.vercel.app, deployment 9AG4yBRRoG6YHSsyyYtTprDgK6cS. Os quatro domínios servem a mesma versão. Conferido no navegador: nome fantasia, total do cliente, duas parcelas, pagamento parcial, detalhe e retorno à lista. Layout do modal em 390 × 844 conferido sem transbordamento horizontal da página. Contêiner e rede de QA removidos.

## Simplificação das telas — 08/10/2026

Contas a receber: a tela apresenta apenas o seletor de ordenação com **Primeiro vencimento mais antigo** (padrão) e **Maior total devido** (saldo em aberto somado por cliente). Foram retirados da interface a ordem por nome, busca de cliente, limites de valor, datas e situação. **Aplicar** confirma a ordem e **Restaurar ordem** volta ao vencimento mais antigo. O seletor de empresas respeita o perfil autenticado. Agrupamento, nome fantasia, parcelas e atualização periódica permanecem. Os filtros da API foram preservados por compatibilidade; esta tela envia apenas ordenação, paginação e escopo de lojas.

Estoque: nos cards do celular, o nome do produto passou a ser o título; foram retirados o rótulo Produto / unidade, a embalagem/unidade, o limite de alerta e a situação. Na tabela desktop permanecem Produto, Disponível e Detalhes. Empresa e botão Ver estoque permanecem. Os filtros de consulta e os detalhes completos foram preservados. Não houve alteração nas regras de urgência, no backend ou no banco.

Publicação frontend em produção: implantação Vercel **2JLDkKK68vekPiCeLa1y7iU22Kq7**, URL https://picos-8zid44qif-leonardo-balbinos-projects.vercel.app. Vue/TypeScript e build Vite aprovados na Vercel. Cópias anteriores de ambas as páginas estão em tmp/picos-bi-ordenacao-20261008, com sufixo .before; restaurar os arquivos e publicar novamente para reverter.

Validação no domínio bi.picoserp.app: as duas ordenações foram conferidas com 20 clientes da primeira página; os 15 cards de estoque da página não exibem os campos retirados; o detalhe do estoque abre corretamente. Visualização de celular sem transbordamento horizontal (375 px de conteúdo e área útil), com tamanho normal do navegador restaurado após a conferência.

## Remoção das tags de estoque — 08/10/2026

Retirados os badges Urgente e Repor dos indicadores e o badge de situação do detalhe de estoque. Rótulos, números, cores dos saldos e regras de urgência permanecem. Alteração somente no frontend, sem modificar backend ou banco. Build Vue/TypeScript e Vite aprovado em produção. Implantação Vercel: 38aGvWSqSesCioqoD9Arnzipe8ZE (https://picos-5qeg1ncqr-leonardo-balbinos-projects.vercel.app). Cópia anterior: tmp/picos-bi-estoque-sem-tags-20261008/EstoqueUrgenciaPage.vue.before; restaurar e republicar para reverter.
