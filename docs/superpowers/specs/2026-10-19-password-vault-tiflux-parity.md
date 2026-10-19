## Cofre de Senhas — paridade de layout/funcionalidades com o TiFlux (DMTE-80)

### Contexto

Issue pede para usar o TiFlux (tela `Cofre de senhas`, menu lateral) como referência de layout, funcionalidades, filtros e modos de exibição, e replicar no painel do Aponta. Investigação feita via navegador (Playwright) logado no TiFlux real da DM Tecnologia; nenhuma senha de cliente foi exibida nas capturas (os valores ficam sempre mascarados atrás de ícones de copiar/revelar).

Estrutura observada no TiFlux:

- `Cofre de senhas` (menu raiz) → lista de **cofres** (nome, quantidade de pastas).
- Dentro de um cofre: árvore de **pastas** à esquerda (com contador de itens) + tabela de **senhas** à direita, colunas **Nome / Usuário / Senha / URL**. Nenhum valor de usuário/senha aparece em texto puro: cada célula só tem um ícone de copiar (copia para a área de transferência sem exibir); a URL tem copiar + abrir; o nome tem um ícone de cadeado que revela a linha ao clicar. Barra superior: busca, botão **Ações** (Nova pasta / Nova senha), botão **Auditoria**. Paginação no fim da tabela. Por pasta: Editar pasta / Remover pasta. Por senha: editar / remover (com confirmação).
- **Auditoria do cofre de senhas** (`/vault/audit`): filtros **Data e hora** (intervalo), **Atendente** (select), **Ação** (select — Criou a senha, Alterou a senha, Visualizou a senha, Revelou a senha, Copiou a senha, Copiou o usuário, Excluiu a senha, Restaurou a senha, Viu o histórico, Abriu um anexo) e busca livre por **Cofre, pasta ou senha**; botão **Exibir** aplica os filtros. Aviso fixo informando que IP e horário de cada ação também são registrados.

### Estado atual do Aponta (gap)

- `apps/api/src/vault`: `Credential` é uma lista plana por `Organization` (sem pastas). `VaultService.findAll` devolve a senha **em texto puro** para qualquer usuário com papel ADMIN/AGENT_MASTER/AGENT, numa única chamada, sem paginação, sem filtro e sem log de quem viu o quê. Não existe endpoint de update (o `UpdateCredentialDto` existe mas não é usado em nenhum controller). Não existe auditoria.
- `apps/web/src/pages/VaultPage.tsx`: lista plana agrupada por organização, sem pastas, sem busca, sem paginação, sem tela de auditoria. Senha some como `********` mas o valor real já chegou ao browser (o botão copiar usa `cred.password` recebido no payload da listagem).

Isso é uma regressão de segurança em relação ao próprio TiFlux: o cofre do Aponta expõe a senha em claro no payload de listagem. Replicar a funcionalidade do TiFlux inclui **não** fazer isso — a senha só deve sair do backend numa chamada pontual de revelar/copiar, que gera registro de auditoria. Criptografia do campo em repouso no banco (hoje é `String` puro) fica fora deste corte — abrir issue de hardening separada.

### Modelo (Prisma)

```prisma
model CredentialFolder {
  id             String       @id @default(uuid())
  name           String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  credentials    Credential[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

enum CredentialAction {
  CREATE_FOLDER
  DELETE_FOLDER
  CREATE_CREDENTIAL
  UPDATE_CREDENTIAL
  DELETE_CREDENTIAL
  REVEAL_CREDENTIAL
  COPY_USERNAME
  COPY_PASSWORD
}

model CredentialAuditLog {
  id             String            @id @default(uuid())
  organizationId String
  action         CredentialAction
  folderId       String?
  credentialId   String?
  targetName     String            // snapshot do nome da pasta/senha (sobrevive à exclusão)
  actorId        String
  actorName      String
  ipAddress      String?
  createdAt      DateTime          @default(now())
}
```

`Credential.folderId String?` (nullable — credenciais sem pasta continuam visíveis, equivalente à raiz do cofre).

### API (RBAC — mantém `JwtOrTokenAuthGuard` + `RolesGuard`, papéis ADMIN/AGENT_MASTER/AGENT para leitura, ADMIN para escrita, igual ao controller atual)

- `GET /vault/folders` — árvore de pastas com contagem de credenciais.
- `POST /vault/folders` `{ name }` — ADMIN. Loga `CREATE_FOLDER`.
- `PATCH /vault/folders/:id` `{ name }` — ADMIN.
- `DELETE /vault/folders/:id` — ADMIN; recusa se houver credenciais dentro. Loga `DELETE_FOLDER`.
- `GET /vault/credentials?folderId=&search=&page=&limit=` — **nunca** inclui `password`; devolve `hasPassword`/`hasUsername` (booleans) em vez do valor. Paginado.
- `POST /vault/credentials` — ADMIN. Loga `CREATE_CREDENTIAL`.
- `PATCH /vault/credentials/:id` — ADMIN (passa a usar o `UpdateCredentialDto` já existente). Loga `UPDATE_CREDENTIAL`.
- `DELETE /vault/credentials/:id` — ADMIN (mantém). Loga `DELETE_CREDENTIAL`.
- `POST /vault/credentials/:id/reveal` `{ field: 'username' | 'password' }` — mesmos papéis de leitura; devolve o valor pontual e loga `REVEAL_CREDENTIAL` (campo username, uso: mostrar na tela) ou `COPY_USERNAME`/`COPY_PASSWORD` (uso: copiar sem exibir), conforme um segundo campo `intent: 'reveal' | 'copy'` no corpo.
- `GET /vault/audit?from=&to=&actorId=&action=&query=&page=` — ADMIN apenas (dado sensível sobre todos os acessos). `query` busca por `targetName`.

### UI (`apps/web/src/pages`)

- `VaultPage.tsx` reescrita: árvore de pastas (lateral) + tabela da pasta selecionada (Nome/Usuário/Senha/URL), valores mascarados (`••••••••`) com ícone de revelar por linha (chama `/reveal` com `intent=reveal`) e ícones de copiar usuário/senha (chamam `/reveal` com `intent=copy`, escrevem na área de transferência, nunca renderizam o valor), busca, paginação, botão **Ações** (Nova pasta/Nova senha) e Editar/Remover pasta, mantendo o gate `user.role === 'ADMIN'` para ações destrutivas/criação.
- `VaultAuditPage.tsx` (nova): filtros Data e hora / Atendente / Ação / busca livre + botão Exibir, tabela de resultados, aviso sobre IP/horário. Rota nova em `App.tsx`, item "Auditoria" no submenu de `Cofre de senhas` em `Sidebar.tsx` (só visível para ADMIN).
- `useVault.ts`: ajustar para pastas + paginação + reveal; novo `useVaultAudit.ts` para a tela de auditoria.

### Fora do escopo deste corte

- Criptografia do campo `password` em repouso (hoje texto puro na coluna) — recomendar issue de hardening separada.
- Ações "Restaurou a senha", "Viu o histórico", "Abriu um anexo" do TiFlux (versionamento/anexos) — não existem hoje no Aponta; não implementar versionamento/anexos nesta issue, só deixar de fora do seletor de Ação da Auditoria os valores que não têm emissor real (evitar filtro morto).

### Critérios de aceite

1. `GET /vault/credentials` nunca devolve `password` em texto puro no payload de listagem.
2. Toda revelação/cópia de usuário ou senha gera uma linha em `CredentialAuditLog` com ator, ação e horário.
3. Tela do Aponta reproduz: árvore de pastas, tabela mascarada com revelar/copiar por campo, busca, paginação, criar/editar/remover pasta e senha (ADMIN).
4. Tela de Auditoria com os 4 filtros (data, atendente, ação, busca) e botão Exibir, visível só para ADMIN.
5. Suite de testes (backend + frontend) cobrindo os pontos 1–4 passando localmente antes do commit.
