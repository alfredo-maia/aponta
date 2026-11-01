## Base de Conhecimento — Stage 4: portal público e extras (DMTE-90, Tier 3)

- Entrega: DMTE-90 · GitHub #102 · Epic #79 · Triagem: DMTE-188 (APROVADO, Tier 3) · SPEC: DMTE-189.
- Spec de origem (decisões de produto e faseamento): `2026-10-19-knowledge-tiflux-parity.md`. Este documento detalha só o Stage 4 e não substitui aquele.
- Base verificada: `main` em `06464db`.

### Objetivo

Clientes e visitantes sem login leem os conhecimentos marcados `PUBLIC` por uma rota pública, sem acesso a nada `PRIVATE`. Como extras de menor prioridade: contador de visualizações e avaliação útil/não útil, esta com toggle.

### Comportamento atual (evidência no código)

- `apps/web/src/App.tsx`: só `/login`, `/register` e `/avaliar/:token` ficam fora de `ProtectedRoute`/`AppLayout`. `/knowledge` é protegido.
- `ArticlesController` (`@Controller('articles')`) usa `OptionalJwtOrTokenAuthGuard`. Anônimo já recebe `PUBLIC` por `buildVisibilityOr` (`articles.service.ts`), e `findOne` devolve 404 para o que não vê (anti-enumeração). Porém, o contrato é de uso autenticado: devolve `author`, `allowedAgentGroups`, etc. e não é feito para exposição aberta.
- Precedente de endpoint público: `PublicCsatController` (`@Controller('public/csat')`, sem guard de auth). Rate limit global: `ThrottlerGuard` (100/min) em `app.module.ts`.
- Schema: `Article.visibility` (`PUBLIC|PRIVATE`), `folderId`; `KnowledgeFolder` (1 nível); `KnowledgeAttachment`. Não há `viewCount`, avaliação nem model de Workspace/Settings.

### Escopo

Dentro: rota web pública, endpoint API público somente leitura, extras P2 (contador; avaliação com toggle).
Fora: edição/criação pública, busca full-text nova, catálogo de serviços e ACL no portal (o portal só enxerga `PUBLIC`), SEO/SSR, domínio/URL próprios, deploy/CD.

### Decisões

- D-01 (confirmada, spec de 19/10): portal em `/r/knowledge/...` no Aponta; extras no Stage 4 com prioridade menor, sem bloquear a rota/endpoint.
- D-02 (proposta técnica): controller novo `PublicKnowledgeController` em `@Controller('public/knowledge')`, **sem** `OptionalJwtOrTokenAuthGuard` nem `PermissionsGuard`, seguindo `PublicCsatController`. Não reaproveitar `/articles` para o portal: um contrato de saída próprio evita vazar campos internos.
- D-03 (proposta técnica): o filtro `visibility = PUBLIC` é aplicado no service, fixo e sem parâmetro de entrada. `findOne` público usa `findFirst({ where: { id, visibility: PUBLIC } })`; qualquer outra coisa (inexistente ou `PRIVATE`) devolve o mesmo 404.
- D-04 (proposta técnica): DTO de saída explícito (allowlist), com `id`, `title`, `content`, `folder {id,name,icon}`, `tags`, `updatedAt`, `attachments {id, originalName, mimeType, fileUrl}` (campos reais de `KnowledgeAttachment`; não há `size` no model). Não expõe `author`, `authorId`, `allowedAgentGroups`, `allowedOrganizations`, `autoShareWithNewOrganizations`, `serviceCatalogItems`, `createdAt`.
- D-05 (proposta técnica): throttle mais restrito que o global no endpoint público de listagem/detalhe (`@Throttle`, a calibrar; sugestão 60/min por IP).
- D-06 (proposta, **depende de confirmação de produto**): o toggle de avaliação mora em um model singleton novo `KnowledgeSettings` (`id`, `ratingEnabled Boolean @default(false)`, `updatedAt`), com GET/PATCH no módulo de conhecimento, escrita sob `MANAGE_KNOWLEDGE_BASE`. Motivo: o schema não tem Workspace/Settings, e o Aponta atual é uma única instância (`Organization` é cliente, não tenant do provedor). Alternativa descartada: toggle por `Organization` (confunde "cliente" com "workspace"); alternativa mais barata: variável de ambiente (não editável pela UI, não atende "toggle").
- D-07 (proposta): avaliação anônima grava voto agregado em `Article` (`helpfulCount`, `notHelpfulCount`, inteiros com default 0) via incremento atômico. Sem dedupe por pessoa nesta fase (limitação aceita, mitigada pelo throttle). Dedupe por IP/cookie fica fora; só entra se o produto exigir.
- D-08 (proposta): contador `Article.viewCount Int @default(0)`, incrementado no `GET public/knowledge/articles/:id` bem-sucedido (incremento atômico `{ increment: 1 }`). Visualização interna autenticada em `/knowledge` fica fora (decisão: contar só o portal público) — confirmar.

### Perguntas de produto (não bloqueiam as fatias 1–3)

1. Confirmar D-06 (model `KnowledgeSettings` singleton, padrão desligado) — responsável: Alfredo (produto). Bloqueia só a fatia 5.
3. Anexos `PRIVATE` via `/uploads` estático: tratar em entrega própria (download autenticado)? — responsável: Alfredo/líder. Não bloqueia S4.1–S4.3.
2. Confirmar D-07/D-08: voto anônimo sem dedupe e contador só no portal público — responsável: Alfredo. Bloqueia só as fatias 4–5.

### Critérios de aceite

Prioridade P1 = núcleo; P2 = extras.

- AC-01 (P1) `GET /public/knowledge/articles` sem `Authorization` responde 200 e lista só `visibility=PUBLIC`, ordenados por pasta/título; com artigos `PRIVATE` no banco, nenhum aparece.
- AC-02 (P1) `GET /public/knowledge/articles/:id` de artigo `PRIVATE` responde 404, igual ao de ID inexistente (mesmo corpo, anti-enumeração), mesmo se o chamador enviar JWT/token de ADMIN ou de usuário com ACL (o endpoint ignora credenciais).
- AC-03 (P1) Parâmetros de query tentando mudar o filtro (`visibility=PRIVATE`, `isPublic`, `where`) são ignorados/rejeitados (ValidationPipe `whitelist`/`forbidNonWhitelisted`) e nunca retornam `PRIVATE`.
- AC-04 (P1) A resposta pública não contém `author`, `authorId`, ACLs, `serviceCatalogItems` nem `autoShareWithNewOrganizations` (teste de allowlist por snapshot de chaves).
- AC-05 (P1) `GET /public/knowledge/folders` lista só pastas com ao menos um artigo `PUBLIC`, com contagem calculada só sobre `PUBLIC`.
- AC-06 (P1) Anexos: o portal só lista/oferece anexos de artigo `PUBLIC`. Achado: `main.ts:37` serve `uploads/` como estático em `/uploads` sem auth, e `fileUrl` aponta para lá; quem souber a URL baixa o arquivo de artigo `PRIVATE`, independentemente deste portal. Decisão: a S4.1 mede o risco (o nome do arquivo gerado pelo multer é aleatório/adivinhável?) e registra; fechar o buraco (download autenticado por rota) é mudança de contrato e exige confirmação do líder/produto antes de entrar no escopo. O portal não deve ampliar a exposição: nunca incluir `fileUrl` de anexo `PRIVATE` na resposta.
- AC-07 (P1) Rota web `/r/knowledge` (lista agrupada por pasta) e `/r/knowledge/:articleId` (leitura) existem **fora** do `ProtectedRoute`/`AppLayout`, sem redirecionar para `/login`; mostram estados de carregamento, vazio, erro e "não encontrado" (404 do AC-02) em pt-BR.
- AC-08 (P1) O conteúdo rico (HTML do Tiptap) é renderizado de forma sanitizada (sem script/handlers inline) no portal, e o link do portal para `/knowledge` interno não aparece para anônimo.
- AC-09 (P1) O endpoint público tem throttle próprio e não herda guard de auth; rota autenticada `/articles` continua inalterada (regressão: testes existentes de `articles` passam sem edição).
- AC-10 (P2) `viewCount` incrementa em 1 por leitura 200 do detalhe público e não incrementa em 404; não aparece em respostas de `PRIVATE`.
- AC-11 (P2) Com `ratingEnabled=false`, a UI do portal não mostra os botões e `POST public/knowledge/articles/:id/rating` responde 403 (ou 404); com `true`, aceita `{ helpful: boolean }`, incrementa o contador correspondente e responde 204/200.
- AC-12 (P2) Voto em artigo `PRIVATE` ou inexistente responde 404, sem alterar contadores.
- AC-13 (P2) GET/PATCH das configurações exigem `MANAGE_KNOWLEDGE_BASE`; anônimo recebe 401, atendente sem permissão 403.
- AC-14 (gate) `pnpm exec nx test api`, `nx test web`, `tsc` e `eslint` (targets conferidos com `nx show project`) passam nos projetos afetados; review independente antes do commit, conforme `WORKFLOW.md`.

### Autorização e tenant

Não há tenant do provedor no schema. O portal é aberto por desenho, por isso a barreira é exclusivamente `visibility=PUBLIC` aplicada no service e testada por AC-01..05, 12. Escrita (settings) exige `MANAGE_KNOWLEDGE_BASE` (`PermissionsGuard`); voto e visualização são as únicas escritas anônimas, limitadas a incrementos atômicos e ao throttle.

### Dados e migração

- P1: nenhuma migração.
- P2: uma migração aditiva (`viewCount`, `helpfulCount`, `notHelpfulCount` com default 0; tabela `KnowledgeSettings`). Aplicação em produção apenas por `migrate deploy` revisado, sob o usuário. Sem backfill. Reversão = nova migração.

### Riscos

- Exposição acidental de campo interno → allowlist (AC-04) e snapshot de chaves.
- XSS no conteúdo HTML público → o conteúdo já é sanitizado na escrita (`apps/api/src/articles/sanitize-article-content.ts`, allowlist com `sanitize-html`); AC-08 verifica que o portal não renderiza nada fora disso (conteúdo legado pré-sanitizador: avaliar re-sanitizar na leitura pública).
- Anexos `PRIVATE` acessíveis por URL estática `/uploads` (ver AC-06): risco pré-existente, fora do escopo do portal; pergunta 3.
- Enumeração por ID → 404 uniforme (AC-02).
- Abuso/scraping e inflação de votos → throttle (D-05); dedupe fora de escopo, risco aceito até decisão do produto.
- Concorrência nos contadores → incremento atômico do Prisma.
- Colisão de rota `/r/...` com rotas atuais → conferir `App.tsx` (hoje livre).

### Fatias (Tier 3)

Cada fatia é um PR com TDD e review; ordem sequencial, WIP 1. Dependências Stages 1–3 já estão em `main` (DMTE-188).

| Fatia | Conteúdo | ACs | Depende de |
|---|---|---|---|
| S4.1 | API pública: controller/service/DTO de saída, throttle, rota de anexo se necessária | AC-01..06, 09 | — |
| S4.2 | Web: rotas `/r/knowledge`, hooks de dados, estados, sanitização | AC-07, 08 | S4.1 |
| S4.3 | Verificação ponta a ponta do portal (E2E leve, anônimo vs PRIVATE) e regressão de `/articles` | AC-01, 02, 07, 09 | S4.2 |
| S4.4 | Extra: `viewCount` | AC-10 | S4.1; resposta 2 |
| S4.5 | Extra: `KnowledgeSettings` + avaliação | AC-11..13 | S4.4; respostas 1 e 2 |

S4.1–S4.3 entregam o valor público e fecham o Stage 4 mínimo. S4.4–S4.5 podem sair em PR posterior.

### Matriz AC → verificação → evidência esperada

| AC | Verificação | Local | Evidência esperada |
|---|---|---|---|
| 01, 03, 05 | Teste de service e de controller com Prisma mockado/DB de teste, incluindo `PRIVATE` no dataset | `apps/api/src/knowledge-public/*.spec.ts` | `nx test api` verde |
| 02 | Controller com JWT de ADMIN no header; espera 404 idêntico ao de ID inexistente | idem | idem |
| 04 | Snapshot das chaves da resposta | idem | idem |
| 06 | Teste do controller de anexos (anônimo × `PUBLIC`/`PRIVATE`) | `knowledge-attachments.controller.spec.ts` ou novo | idem |
| 07, 08 | RTL: renderiza `<App/>` em `/r/knowledge` sem sessão, 4 estados, HTML malicioso sanitizado | `apps/web/src/pages/PublicKnowledge*.test.tsx` | `nx test web` verde |
| 09 | Teste do guard/metadata (sem `UseGuards` de auth, `@Throttle` presente) + suíte atual de articles | api | idem |
| 10–13 | Testes de service/controller e RTL do toggle | api/web | idem |
| 14 | `tsc`, `eslint`, `nx test` com cache desativado no QA | CI/local | saída dos comandos e SHA |

Referência visual/fluxo (UI): não há referência TiFlux do portal público no spec de origem. Usar o DS existente (`Ez*`, tokens, padrão de `PublicCsatPage` para página sem layout) e o layout de grade por pasta da `KnowledgePage`. Se o produto quiser fidelidade ao portal do TiFlux, é preciso benchmark autorizado (`URL_TIFLUX`/`USER_TIFLUX`/`PASS_TIFLUX`), não realizado nesta rodada. Story: componente de cartão de artigo/pasta apenas se for novo (preferir reuso, sem story nova).

### Pendências

- Perguntas 1 e 2 (Alfredo), só para S4.4–S4.5.
- Confirmar na S4.1: entropia do nome de arquivo dos uploads e necessidade de re-sanitizar conteúdo legado na leitura pública.
