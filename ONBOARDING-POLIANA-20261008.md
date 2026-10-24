# Inclusão de Água de Coco e Gelo Poliana no BI

Data: 08/10/2026. Ambiente: produção.

## Resultado

Empresa validada por consulta somente leitura à API Meu ERP Online: AGUA DE COCO E GELO POLIANA, razão social PRIMOSALIA CARVALHO DE ARAUJO PESSOA, CNPJ 07635639000192, Picos/PI, código de empresa ERP 1.

Foi criada uma organização independente, uma loja e um usuário FRANQUEADO associado somente a essa loja. O acesso utiliza o frontend existente: https://picos-bi.vercel.app. Login: poliana@picosbi.local. Esse endereço é um identificador de acesso, sem caixa postal. Senha e chave ERP não constam nesta documentação.

| Registro | Identificador |
|---|---|
| Organização | 6c7103c5-4a22-4ae5-8e97-d49feeedd39d |
| Loja | ca1a1a30-3666-4c0f-9b68-888675b91494 |
| Usuário | 640c26b7-7cb8-48e4-b430-752c08efb270 |
| Código da loja | poliana |

## Fluxo de dados e atualização

O navegador consulta o backend do BI na VPS, por HTTPS e JWT. O backend consulta o PostgreSQL picos_analytics e utiliza o Redis para cache. Somente as rotinas do backend utilizam a chave da loja para consultar o Meu ERP Online; a chave não é devolvida nas respostas dos cadastros.

A loja ficou inativa durante a preparação e a importação inicial. Depois de 28 tarefas de importação concluídas com sucesso, foi ativada para entrar na rotina normal:

- A cada 10 minutos: vendas, itens vendidos e comissões do dia atual.
- Reconciliação diária: tentativas às 03:05, 03:15, 03:25, 03:35, 03:45 e 03:55, horário de São Paulo. Atualiza o dia anterior, busca os dias ainda ausentes nas janelas existentes e atualiza os cadastros/estoque/contas.
- A janela de vendas é de 365 dias; itens vendidos e comissões, 90 dias. A importação inicial feita nesta operação abrange apenas 02/10/2026 a 08/10/2026. O restante do histórico fica para a reconciliação; não foi declarado como já importado.
- Uma trava Redis compartilhada impede duas sincronizações simultâneas. A importação inicial usou essa mesma trava, com renovação da concessão, e a mesma fila de requisições do ERP: aproximadamente 18 chamadas/minuto, incluindo paginação e retentativas. Um ciclo pode ser adiado quando outra sincronização estiver em execução.

A rotina de importação utiliza os serviços reais compilados, sem iniciar outro AppModule/cron e sem alterar cadastros no ERP. A conta de acesso pode consultar os dados já armazenados sem esperar uma nova chamada ao ERP.

## Dados importados e regras preservadas

Contagens ao concluir a carga inicial:

| Conjunto | Registros |
|---|---:|
| Documentos de venda do ERP armazenados | 868 |
| Produtos | 21 |
| Pessoas | 268 |
| Formas de pagamento | 7 |
| Locais de estoque | 2 |
| Saldos de estoque | 21 |
| Contas pendentes | 1.556 a receber; 0 a pagar |
| Agregações diárias de itens vendidos | 44 |
| Comissões retornadas pelo ERP | 0 |

O endpoint de vendas retornou 735 documentos para o período de sete dias. Essa quantidade é diferente dos 868 documentos armazenados porque a consulta existente filtra o tipo de movimento e os critérios financeiros. Os indicadores da interface aplicam também os critérios de venda elegível com valor positivo. As regras comerciais de faturamento não foram alteradas nesta inclusão.

Na validação visual de hoje, o painel da Poliana exibiu R$ 5.153,00 em 38 vendas elegíveis. Isso é uma observação do momento da verificação, não um fechamento definitivo do dia.

## Ajustes necessários de isolamento entre clientes

Algumas tabelas de cadastros usavam como chave única apenas o código enviado pelo ERP. Dois clientes podem ter o mesmo código, por exemplo produto 1 ou forma de pagamento 1. Isso poderia substituir registros de uma empresa com dados de outra.

Foi adicionada a função codigoDaLoja: os códigos da loja-inhuma permanecem iguais; para novas lojas, as chaves passam a incluir o ID da loja. Foi aplicado o mesmo padrão a produtos, pessoas, formas de pagamento, locais e saldos de estoque, documentos de contas pendentes e referência de produto em itens vendidos. O código original do ERP continua sendo utilizado nas URLs de consulta; o prefixo existe somente na persistência interna.

A identificação da empresa e os logs de sincronização agora respeitam o escopo do usuário. A sincronização de empresa também recebe a chave específica da loja. Empresa legado mantém o ID default; Poliana utiliza empresa_ seguido do ID da loja.

Esses ajustes foram feitos no backend. Não houve mudança de schema, migration, reset, alteração de regras de valores, nem deploy do frontend. O domínio existente foi mantido. Os demais sistemas da VPS não foram alterados.

## Verificação

- Build do backend aprovado.
- 8 suítes existentes, 51 testes aprovados.
- Teste de integração com PostgreSQL descartável: dois clientes com códigos ERP iguais mantiveram separados produtos, pessoas, pagamentos, estoque, contas e dados de empresa. Foi validada a preservação dos identificadores legados e o vínculo das referências de estoque.
- Login de produção aprovado; JWT possui perfil FRANQUEADO e somente o ID da Poliana.
- GET /lojas retorna somente Poliana, ativa, sem erpToken.
- GET /empresa retorna o CNPJ da Poliana.
- Consultas explícitas à loja-inhuma em empresa, status de sincronização, produtos e vendas retornaram HTTP 403. A listagem administrativa de franqueados também retornou 403. Sem autenticação, empresa retornou 401.
- Endpoints de resumo/paginação de vendas, produtos, pessoas, pagamentos, estoque, contas, itens vendidos, comissões e sincronização retornaram HTTP 200. As vendas retornadas pertencem somente à Poliana.
- As dez entidades de sincronização possuíam log de sucesso após a carga inicial.
- O ciclo automático das 14:40 foi observado sem disparo manual: a venda do dia da Poliana teve sucesso em 08/10/2026 às 14:40:16, horário de São Paulo (17:40:16 UTC). O endpoint de atualização confirmou intervalo de 10 minutos.
- Login pela interface e painel com dados reais confirmados.
- Inhuma manteve 10.736 documentos de venda e 29 produtos na consulta de preservação.
- O PostgreSQL temporário de QA e o túnel utilizado para ele foram removidos/encerrados ao terminar os testes. A cópia local temporária com chave ERP e senha foi removida após a validação; a chave permanece somente na configuração da loja no backend.

As respostas verificadas não contêm a chave ERP. A evidência de isolamento valida os caminhos testados; novos endpoints devem manter a mesma autorização no servidor e o escopo da loja nas chaves de cache.

## Deploy, backup e recuperação

Aplicação: isv-picos-bi-app-1. Imagem publicada: isv-picos-bi:poliana-20261008.
Imagem anterior preservada: isv-picos-bi:pre-poliana-20261008.
Release: /opt/interserver/releases/picos-bi-poliana-20261008.
A alteração de imagem foi registrada em /etc/interserver/picos-bi.env, sem divulgação de seu conteúdo.

Antes da implantação foi gerado dump PostgreSQL em formato custom:

/var/backups/interserver/manual/picos-bi-poliana-20261008T171953Z/picos_analytics.dump

Diretório protegido com permissão 0700 e arquivos 0600. Foram validados checksum SHA-256 e leitura do catálogo com pg_restore --list. Não foi realizada restauração completa de ensaio dessa cópia. O mesmo diretório contém uma cópia protegida da configuração anterior.

O artefato de deploy contém somente os arquivos compilados referentes aos ajustes de isolamento, sobre a imagem anterior. Não contém .env, credenciais nem dados do cliente. SHA-256 do artefato:

e3607771e0852b22d6486c6534b01ef7666a7b297bf232cdf7c961e26b009e03

Para recuperação, preferir correção adiante. Antes de retornar à imagem antiga, desativar somente a Poliana e interromper suas importações: a versão antiga não possui os ajustes de isolamento dos novos cadastros. Não restaurar o dump sobre a base ativa automaticamente, pois isso eliminaria alterações posteriores de todos os clientes. Uma restauração exige avaliação do estado atual e procedimento específico.

## Referência para inclusão de outros clientes

1. Confirmar empresa/CNPJ pela própria chave ERP, sem escrever no ERP.
2. Manter chave no backend e fora dos artefatos, documentação e respostas HTTP.
3. Criar organização/loja própria, inicialmente inativa, e usuário limitado às lojas autorizadas.
4. Utilizar códigos internos com escopo de loja e a chave específica em todas as chamadas upstream.
5. Gerar backup e validar o artefato antes de alterar o serviço.
6. Importar primeiro uma janela recente e os cadastros, com fila e trava compartilhada, sem iniciar outro cron.
7. Validar login, dados próprios e tentativas de acesso a outra loja pelo backend.
8. Ativar a loja, conferir o ciclo automático e registrar a janela efetivamente importada.
9. Remover recursos temporários de QA e cópias de segredos usadas somente na preparação.

Para futuras alterações, manter testes com clientes que possuam códigos iguais no ERP. Não confiar apenas no filtro visual de lojas: a autorização precisa ocorrer no backend.
