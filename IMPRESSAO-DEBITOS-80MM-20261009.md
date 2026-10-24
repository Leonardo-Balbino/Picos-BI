# Comprovante de débitos em 80 mm — 09/10/2026

## Fluxo

Contas a receber → abrir o cliente/Ver parcelas → Imprimir / compartilhar.
O modal novo apresenta prévia em preto e branco, Salvar PDF, WhatsApp e Imprimir.

O comprovante contém empresa credora, cliente (nome fantasia preferido e razão social complementar), emissão, documento, parcela, vencimento, original, pago, saldo e totais. Situação e detalhes não aparecem no comprovante. A consulta normal de parcelas mantém o acesso aos detalhes.

O arquivo inclui todas as parcelas em aberto, não apenas as 10 da página atual. As consultas usam o mesmo endpoint autenticado e escopo de empresas. Em alterações de contagem/saldo durante a coleta, erro seguro solicita nova consulta; não se produz PDF parcial ou com IDs repetidos.

## Formato

PDF vetorial/texto com jsPDF 4.2.1, largura real de 80 mm, margens de 4 mm. Altura variável por página até 1.200 mm, sem dividir uma parcela entre páginas. A revisão compacta descrita abaixo substitui o formato inicial de até 280 mm. Exemplo atual com duas parcelas tem 75 mm de altura. Preto e branco, sem blocos coloridos.

A mesma disposição em milímetros gera PDF e SVG para prévia/impressão, com texto dinâmico escapado. A impressão abre uma janela do navegador e aciona window.print; o usuário escolhe impressora e papel 80 mm. Não foram enviados trabalhos a uma impressora física nesta validação.

WhatsApp: quando o aparelho suporta compartilhamento de arquivos, abre o menu nativo com o PDF, para selecionar WhatsApp e destinatário. Quando não suporta, baixa o PDF e abre WhatsApp, orientando anexá-lo manualmente. Não há envio automático nem dados de dívida em URL pública.

## Publicação e validação

Frontend Vercel: AXxczNzVM6EXMyTs8SAVfYu5xxEX.
Release: https://picos-9v96ox6lw-leonardo-balbinos-projects.vercel.app.
Produção: https://bi.picoserp.app/contas-a-receber, aliases preservados.
Nenhuma alteração de backend ou banco. Nenhum servidor local foi iniciado.

vue-tsc e Vite passaram localmente e na Vercel. jsPDF é carregado somente ao abrir o modal. A auditoria não apontou avisos para a nova biblioteca ou suas dependências PDF examinadas.

Verificação automatizada: coleta de 125 parcelas em duas páginas; rejeição de resposta alterada/vazia; 2 páginas de PDF na revisão compacta, com largura 80 mm e sem cortar parcelas; totais em centavos; texto escapado; window.print acionado somente na janela do comprovante.
PDFs foram reabertos e renderizados para conferência visual e de dimensões.

Conferência autenticada em produção: cliente da captura, 2 parcelas, original R$ 582,50, pago R$ 200,00, saldo R$ 382,50. Download pelo botão Salvar PDF confirmado e PDF reaberto, com largura 80 mm e ausência de Situação/Detalhes.
Exemplo: output/pdf/exemplo-debitos-cliente-80mm.pdf.
Captura: bi-debitos-impressao-80mm-20261009.png na pasta de visualizações da conversa.

## Correção compacta após teste na impressora — 09/10/2026

A foto enviada mostrou repetição do cabeçalho, seis linhas por parcela e rodapé do navegador (about:blank/data/página). A revisão agrupa os mesmos campos em três linhas por parcela, reduz espaçamentos e usa a altura efetiva do conteúdo para papel contínuo. Comprovantes comuns ficam em uma página; o limite de segurança para documentos muito longos é de 1.200 mm. PDF, prévia e impressão continuam usando a mesma disposição.

Cliente da foto: DISTRIBUIDORA DUAS BARRAS, 11 parcelas, saldo R$ 1.787,00. Antes: duas páginas de 260 e 196 mm (456 mm somados). Agora: uma página de 202 mm, redução de 56%, mantendo documentos, parcelas, vencimentos e valores. Exemplo de uma parcela: 80 × 61 mm, orientação corrigida para preservar a largura em recibos curtos.

Validação: coleta de 125 parcelas, totais, escape, respostas inconsistentes, CSS de impressão e chamada de window.print aprovados. As 125 parcelas ocupam duas páginas longas. PDF real reaberto, texto e dimensões conferidos e renderização inspecionada, incluindo separadores sem sobreposição. vue-tsc e Vite aprovados localmente e na Vercel. Nenhum servidor local iniciado.

A impressão usa @page global com tamanho efetivo e margem zero. O modal orienta papel de 80 mm contínuo, escala 100%, margens Nenhuma e Cabeçalhos e rodapés desativados. As preferências do navegador/driver não podem ser impostas pelo site. Não foi realizado novo teste em impressora física.

Frontend Vercel: 7jddoFh2cWkAM6r2zx4ojUqjUG8G.
Release: https://picos-7erfvetcm-leonardo-balbinos-projects.vercel.app.
Exemplo final: output/pdf/exemplo-debitos-80mm-compacto.pdf.

Conferência autenticada no domínio bi.picoserp.app após publicar: 11 parcelas, saldo R$ 1.787,00 e um SVG único de 80 × 202 mm. Modal e instruções novos confirmados. Captura: bi-debitos-compacto-20261009.png na pasta de visualizações da conversa.
