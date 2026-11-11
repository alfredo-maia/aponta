---
name: aponta-deps
description: Atualizar dependências do Aponta (pnpm, imagens base, GitHub Actions) com conferência de origem e validação de compatibilidade.
---

# Atualização de dependências no Aponta

Vale só para mudança que toca `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, a tag de uma imagem base nos Dockerfiles ou o commit fixado de uma action. Se o diff também altera código de produto, migração ou configuração, é uma entrega comum e segue a esteira inteira.

O repositório não tem bot de atualização. A atualização é uma entrega com identidade própria, branch e PR, e passa pela fila de merge como qualquer outra; não há push direto na `main`.

**Origem, antes de instalar.** Cada pacote novo ou alterado precisa vir do registro público do npm, com o nome e a versão esperados e a integridade gravada no lockfile. Pare e leve à revisão completa (aponta-review, nível ALTA) quando aparecer: dependência por Git, caminho ou URL; pacote renomeado, de outro escopo ou com nome parecido com o de um conhecido; script de instalação novo (`preinstall`, `install`, `postinstall`) ou entrada nova em `onlyBuiltDependencies`/`--allow-build`; salto de versão major que ninguém pediu. Scanner de vulnerabilidade só conhece o que já foi publicado como vulnerável; ele não substitui essa conferência.

**Agrupar com critério.** Junte num PR as atualizações de patch e minor do mesmo ecossistema (por exemplo, o conjunto `@nx/*`, que precisa andar junto). Mantenha separado: major, Prisma (muda cliente gerado e migrações), NestJS, React, Vite, Playwright e a imagem base do Node. Uma falha num PR agrupado é isolada num worktree descartável e resolvida no próprio PR, com a versão fixada ou a correção; não se desfaz o lote inteiro.

**Validar.** Instale com `pnpm install --frozen-lockfile` depois de regenerar o lockfile, rode lint, typecheck, testes e build de `api` e `web`, e deixe o E2E para o CI. Actions são fixadas pelo SHA do commit, com a versão em comentário. Não use formatador amplo nem enfraqueça teste para "corrigir" uma quebra.

**Registrar.** No PR: versões diretas e transitivas que mudaram, o que foi conferido na origem, os comandos executados e o resultado, e o que ficou de fora com o motivo.
