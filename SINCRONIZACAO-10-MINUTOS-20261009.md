# Sincronização operacional a cada dez minutos — 09/10/2026

## Diagnóstico

Vendas já possuíam cron a cada dez minutos. Estoque, catálogo, pessoas e contas a receber executavam somente no minuto 05 de cada hora. Os logs de produção às 11h08 (São Paulo) mostraram ESTOQUE com sucesso às 08h05, 09h05, 10h05 e 11h05 para ambas as empresas. Não havia trava de sincronização ativa. A tela de estoque consulta o backend a cada minuto quando visível, sem cache de sessão; o endpoint de estoque lê o PostgreSQL. Portanto atualizar o navegador não antecipava a próxima coleta no ERP.

## Correção

Cron ciclo-estoque-receber passou de 5 * * * * para 5,15,25,35,45,55 * * * * no fuso America/Sao_Paulo. Estoque, produtos, pessoas e contas a receber passam a atualizar a cada dez minutos. O deslocamento de cinco minutos em relação às vendas evita a disputa habitual pela mesma trava. A proteção contra concorrência, os limites e retentativas da API, o histórico e o isolamento por empresa foram preservados.

Não houve migrations nem alterações em telas. O fluxo continua ERP → backend/PostgreSQL na VPS → frontend. O botão Atualizar dados relê o backend; a coleta do ERP independe de navegador aberto. Falhas externas ou uma importação ainda em andamento podem adiar um ciclo, como antes, e ficam registradas.

## Testes e publicação

73 testes em 12 suítes e compilação Nest aprovados. Teste de regressão usa o cron efetivamente registrado e verifica duas execuções com dez minutos de distância e fuso São Paulo.

Imagem publicada: isv-picos-bi:sync-10min-20261009. Anterior: isv-picos-bi:estoque-locais-20261009. Release: /opt/interserver/releases/picos-bi-sync-10min-20261009. Overlay limitado ao serviço de sincronização compilado; recriado somente app. Rollback automático preparado; cópia de ambiente protegida no diretório do release.

Agendamento lido da imagem publicada confirmou próximas execuções às 11h15 e 11h25 de 09/10/2026. Evidência em tmp/picos-bi-sync-10min-20261009/cron-production.json. Validação da execução automática será registrada após o ciclo.

## Confirmação do ciclo automático

Sem disparo manual de sincronização, o cron das 11h15 executou com sucesso para as duas empresas. Estoque Açaí às 11h15m12s (26 saldos), Poliana às 11h15m40s (21 saldos em Loja e Fábrica). Contas a receber: Açaí às 11h15m16s e Poliana às 11h17m16s (1.588 registros processados).

Na Poliana, água de coco 1L mudou de 217 para 184 unidades e 300ml de 691 para 511. O botão Atualizar dados confirmou que o frontend já recebe esses novos valores do backend. Não houve importação manual nem necessidade de recarregar o deployment frontend.

Evidência final: tmp/picos-bi-sync-10min-20261009/verification.json. Captura bi-estoque-sync-10min-20261009.png na pasta de visualizações desta conversa.
