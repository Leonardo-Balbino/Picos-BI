# Subdomínio do BI — 08/10/2026

Endereço recomendado para acesso: https://bi.picoserp.app

## Configuração aplicada

O subdomínio foi associado ao projeto existente picos-bi na Vercel em produção. Não há aplicação duplicada nem nova base: os endereços servem a mesma implantação.

DNS GoDaddy, único registro adicionado:
- Tipo: CNAME
- Nome: bi
- Destino: c9e5fe1333a4e42e.vercel-dns-017.com.
- TTL apresentado após salvar: 1 hora.

Nenhum registro existente foi removido ou alterado. Os acessos picoserp.app, www.picoserp.app e picos-bi.vercel.app continuam disponíveis durante a transição. O domínio raiz não recebeu redirecionamento nesta etapa.

Na VPS foi acrescentada apenas a origem https://bi.picoserp.app ao CORS_ORIGIN em /etc/interserver/picos-bi.env. As três origens anteriores foram preservadas; não há autorização curinga. Foi mantida a imagem isv-picos-bi:poliana-20261008, recriando apenas o serviço app do BI, sem alterar o banco ou os demais serviços.

A operação utilizou o guard do projeto, backup protegido e a trava Redis de sincronização, com recuperação da configuração anterior em caso de falha de saúde.
Backup: /var/backups/interserver/manual/picos-bi-subdominio-20261008T183033Z/picos-bi.env.rollback
O arquivo contém configuração sensível e permanece com permissão 0600.

## Validação

- Vercel: domínio verificado, DNS configurado por CNAME, sem conflitos e misconfigured=false.
- Certificado HTTPS emitido automaticamente; requisições realizadas com validação normal de certificado, sem desativar TLS.
- HTTPS /login retorna 200 nos quatro endereços, com o mesmo arquivo JS da implantação atual.
- Tela de login abriu no navegador em bi.picoserp.app.
- Preflight do backend retorna 204 e a origem exata para os quatro domínios.
- Logins Açaí Senses e Poliana e consulta autenticada às unidades passaram usando Origin https://bi.picoserp.app. Cada cliente recebeu somente sua unidade.
- Origem não autorizada de teste permaneceu sem cabeçalho de autorização CORS.
- Container app do BI saudável após aplicar configuração.
- Não foram alterados usuários, senhas, chaves ERP, dados ou cadência da sincronização.

Sessões de navegador pertencem a cada domínio. No primeiro acesso ao novo subdomínio, entrar novamente usando as mesmas credenciais.

## Referência para futuras alterações

Para disponibilizar outro subdomínio do BI:
1. Adicionar o endereço ao mesmo projeto picos-bi na Vercel.
2. Consultar o CNAME recomendado pela Vercel; criar somente o host correspondente no provedor DNS.
3. Acrescentar a origem HTTPS exata ao backend, preservando as origens em uso, com backup e trava de sincronização.
4. Aguardar DNS e certificado; validar login, CORS, consultas e isolamento por cliente.
5. Só retirar os endereços anteriores após decisão específica e verificação de que os usuários já migraram.

Não é necessário novo deploy de código para essa alteração de domínio. Para reverter, remover a associação e o CNAME de bi e restaurar apenas a configuração CORS a partir do backup, recriando somente o serviço app do BI. Não restaurar banco de dados nem remover volumes.

Evidências locais: tmp/picos-bi-subdominio-20261008/
