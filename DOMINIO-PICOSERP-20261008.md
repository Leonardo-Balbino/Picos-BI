> Atualização: o endereço recomendado passou a ser https://bi.picoserp.app. Consulte SUBDOMINIO-BI-PICOSERP-20261008.md; os endereços anteriores permanecem disponíveis.

# Domínio picoserp.app — BI em produção

Configurado em 08/10/2026, exclusivamente para o projeto Picos BI.

## Endereços

- https://picoserp.app
- https://www.picoserp.app
- https://picos-bi.vercel.app — mantido e funcionando.

Os três nomes apontam para o mesmo frontend de produção da Vercel. Não há redirecionamento obrigatório entre eles: cada endereço pode abrir o BI diretamente. Os usuários e senhas existentes continuam sendo usados. Como a sessão do navegador pertence a cada origem, acessar um endereço diferente pode exigir novo login.

Projeto Vercel: picos-bi, equipe leonardo-balbinos-projects.
Project ID: prj_ACROwGRHbdWkqIA8jZmJfgW9PAkK.
Os três domínios estão associados à produção. Não foi necessário publicar novo código frontend.

## DNS na GoDaddy

Foram editados somente estes dois registros:

| Tipo | Nome | Valor atual | TTL |
|---|---|---|---|
| A | @ | 216.198.79.1 | 600 segundos |
| CNAME | www | c9e5fe1333a4e42e.vercel-dns-017.com. | 1 hora |

Antes: A @ estava Parked; CNAME www apontava para picoserp.app.
Os destinos novos foram obtidos da configuração do próprio projeto na Vercel. Não foram escolhidos por suposição de endereço genérico.

NS ns11.domaincontrol.com e ns12.domaincontrol.com, SOA, _domainconnect e _dmarc foram preservados. Não houve mudança de servidores DNS, configuração de e-mail ou de domínios dos outros sistemas.

A Vercel confirmou Valid Configuration para os dois novos domínios. Os certificados TLS foram emitidos e as páginas foram verificadas por HTTPS com validação de certificado e nome do host. A emissão/propagação do certificado do domínio sem www levou alguns minutos após a validação DNS.

Resolvers podem continuar usando registros antigos durante o TTL já armazenado em cache. Isso não exige refazer o apontamento.

## Comunicação com o backend

A API permanece em https://picos-bi-api.162-35-175-137.sslip.io/api/v1. O domínio novo é do frontend do BI.

CORS_ORIGIN em /etc/interserver/picos-bi.env passou a conter:

CORS_ORIGIN=https://picos-bi.vercel.app,https://picoserp.app,https://www.picoserp.app

A configuração foi copiada para um backup protegido antes de ser editada. Foi utilizada a trava Redis de sincronização e o guard.sh de validação da VPS. Somente app do componente picos-bi foi recriado via compose.sh; foi mantida a imagem isv-picos-bi:poliana-20261008. O serviço ficou healthy. Não houve migration ou restauração de banco.

Backup da configuração anterior:

/var/backups/interserver/manual/picos-bi-domain-20261008T180624Z/picos-bi.env.rollback

O arquivo contém segredos e deve permanecer protegido; não copiar seu conteúdo para documentação, chat, Git ou Vercel.

## Validação

- picoserp.app/login: HTTP 200, frontend BI correto, HTTPS validado.
- www.picoserp.app/login: HTTP 200, frontend BI correto, HTTPS validado.
- picos-bi.vercel.app/login: HTTP 200, frontend BI correto, HTTPS validado.
- Login e consulta autenticada de resumo: HTTP 200 com Access-Control-Allow-Origin correto para cada um dos três endereços.
- Preflight de POST /auth/login: HTTP 204 com a origem autorizada.
- Origem não autorizada de teste: sem Access-Control-Allow-Origin; nenhuma liberação com curinga.
- Login real pela interface em www.picoserp.app abriu o painel da Poliana e seus dados.
- A página de login de picoserp.app também abriu no navegador após a propagação do certificado. A última tentativa de completar o login nessa aba foi interrompida por uma interface de extensão do Brave; a verificação autenticada desse domínio foi concluída pela API.
- A Vercel confirmou os três domínios verificados no mesmo projeto, sem redirect configurado.
- A conta de teste e a chave ERP não foram alteradas nem copiadas para a Vercel.

## Próximos deploys e recuperação

Preservar as três origens em CORS_ORIGIN durante atualizações do backend. Preservar os domínios da produção na Vercel. O navegador deve continuar usando somente a API do backend; o Meu ERP é consultado pela sincronização do servidor.

Para reverter apenas o apontamento, editar os dois registros na GoDaddy e/ou remover somente os dois domínios novos do projeto Vercel, mantendo picos-bi.vercel.app. Isso é um procedimento de recuperação, não uma ação realizada nesta configuração.

Para reverter CORS, comparar a variável com o backup protegido e recriar somente app via /opt/interserver/scripts/compose.sh picos-bi up -d --no-deps app, em janela coordenada com a sincronização. Não restaurar o banco e não executar down -v.

Referências oficiais: [domínios na Vercel](https://vercel.com/docs/domains/set-up-custom-domain) e [certificados TLS](https://vercel.com/docs/cli/certs). Os registros desta documentação refletem os valores efetivamente indicados e testados em 08/10/2026.
