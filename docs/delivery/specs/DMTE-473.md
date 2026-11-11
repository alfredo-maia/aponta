# CI/CD: staging, artefato por commit, promoção para produção e contrato por etapas

Identidade: DMTE-473, issue dmrepositorio/aponta#177, Tier 3, ciclo 2026-11-09/2026-11-22. Pedido do usuário (Alfredo) em 10/11/2026. Construída sobre a DMTE-472 (PR #176).

## Situação atual (auditoria de 10/11/2026)

- **Repositório**: público, organização no plano gratuito. Fila de merge nativa ativa na `main` (ruleset 26762558: quatro checks obrigatórios, `SQUASH`, `ALLGREEN`, um PR por vez, `strict` desligado, `deletion` e `non_fast_forward` bloqueados).
- **CI** (`ci.yml`): `pull_request`, `merge_group` e `push` na `main`. Jobs `Lint, typecheck, unit tests` e `E2E (Playwright, full stack)`, este com Postgres do próprio job. Sem `continue-on-error`. Sem bloco `permissions`. Actions por tag.
- **Contrato** (`delivery.yml`, `independent-qa-queue.yml`): `Delivery contract` e `Independent QA`, ambos em `merge_group`.
- **CD** (`deploy.yml`): `workflow_run` do CI; SSH na VPS, `git reset --hard`, remove os containers e roda `docker compose up -d --build` no projeto `aponta-prod`. `appleboy/ssh-action@master`. Em 10/11 publicou commits fora de ordem (DMTE-472).
- **Infraestrutura**: uma VPS (4 CPUs, 15 GB), Docker Compose, Caddy no host (`dm.aponta.cloud` → `127.0.0.1:8090`). Imagens construídas no servidor a cada deploy, sem nome por commit. Não há registro de imagens nem staging.
- **Configuração**: `.env.prod` para interpolação e `.env` como arquivo de ambiente dos serviços, ambos no checkout da VPS. O front embute `VITE_API_URL=/api`.
- **Integrações externas do produto**: SMTP e IMAP. Sem fila, cobrança ou outro serviço.
- **Feature flags**: não existem.
- **E2E local**: portas 3100/3101 e banco fixos; agentes na mesma VPS colidem.
- **Skills**: `.agents/skills` tem os perfis `aponta-delivery`, `aponta-flow`, `aponta-review`, `aponta-sdd`, `aponta-tdd` e os métodos originais fixados por hash. Não há perfil para auditoria de issue nem para dependências.

## Decisões

- **Fila de merge nativa** é a validação da combinação; nada a substituir. Entram só ajustes de segurança nos workflows.
- **Artefato**: imagens nomeadas pelo commit, construídas uma vez na VPS a partir de `git archive` do commit. Sem registro externo: é a opção mais simples compatível com o deploy atual e não cria custo nem credencial. O identificador da imagem local vai para o registro do commit.
- **Staging compartilhado** na mesma VPS, projeto Compose `aponta-staging`, com banco, volumes, portas e credenciais próprios, seed sintético, SMTP zerado e IMAP desligado. Ambiente por PR não se justifica.
- **Ferramenta** `scripts/aponta_release.py` (biblioteca padrão, com testes) decide: `stage` faz deploy → testes → registro sob trava; `promote` só aceita commit com registro aprovado e as mesmas imagens, e recusa commit que não contém o que está no ar, exceto com `--rollback`.
- **Workflow** `CD (Produção)` em três jobs: resolve a ponta da `main` com CI verde, Staging, Produção. Um ciclo por vez, sem cancelar o que está em andamento. Environments `staging` e `production` do GitHub, para permitir aprovação humana opcional.
- **Identidade no ar**: `GET /api/version` e `/version.json` devolvem o commit da imagem.
- **Feature flags**: registro tipado na API com responsável, padrão e data de remoção; valor por ambiente em `FEATURE_<CHAVE>`; `GET /api/feature-flags`; hook `useFeatureFlag`. Registro vazio. Flag vencida falha o teste.
- **Isolamento**: `scripts/e2e_isolated.sh` para execuções locais; nada muda no CI, que já isola por máquina.
- **Contrato**: seis estados em `docs/delivery/WORKFLOW.md`; guia em `docs/delivery/RELEASE.md`; mapeamento em `docs/agents/akita-mapping.md`.
- **Skills**: atualiza `aponta-review`, `aponta-delivery`, `aponta-tdd` e `aponta-flow`; cria `aponta-triage` e `aponta-deps`, onde havia lacuna.
- **Fora desta entrega**: merge, publicação em produção, DNS e Caddy do staging, instruções dos agentes no Multica.

## Acceptance criteria

- AC-01: `promotion_errors` recusa commit sem registro de staging, com staging reprovado, com registro de outro commit ou com imagem diferente da validada, e aceita commit e imagens validados.
- AC-02: `ordering_errors` aceita o primeiro deploy e commit mais novo; recusa commit mais antigo e commit fora do histórico do que está no ar; com rollback, aceita só ancestral do commit no ar.
- AC-03: staging e produção ficam em projetos, arquivos de ambiente e sobreposições Compose distintos; o arquivo de ambiente gerado para o staging tem segredos próprios, porta diferente e nenhuma configuração de e-mail; ambiente desconhecido é recusado.
- AC-04: `smoke` passa só quando a página, a saúde da API e o commit da API e do front correspondem ao commit esperado; página inacessível vira verificação reprovada, não exceção.
- AC-05: o registro é gravado e lido por commit.
- AC-06: `GET /api/version` devolve o commit de `APONTA_COMMIT`, ou `unknown` sem ele.
- AC-07: as feature flags resolvem o padrão e a variável de ambiente, ignoram valor inválido e flag não registrada; o validador acusa flag vencida, sem responsável, com chave inválida, com data inválida e duplicada; o controller devolve os valores; `useFeatureFlag` fica desligado enquanto carrega, quando a API falha e para flag desconhecida.
- AC-08 (operacional): o staging sobe na VPS a partir das imagens de um commit, com seed sintético, e o registro desse commit sai `passed` com as verificações de saúde, commit e fluxos críticos.
- AC-09 (operacional): com o registro aprovado, `promote` recusa um commit sem registro e um commit mais antigo; a promoção real para produção fica para o primeiro deploy depois do merge.
- AC-10 (operacional): `scripts/e2e_isolated.sh` usa banco e portas próprios da execução e remove só os recursos dela.
- AC-11 (documental): contrato com os seis estados, validade das evidências, guia de release com diagrama e mapeamento das skills de referência.

## Testes

- `scripts/test_aponta_release.py` (AC-01 a AC-05): RED com as funções como stubs neutros, 17 falhas por asserção (`.delivery/evidence/DMTE-473/red.json`); GREEN com o mesmo comando e arquivo.
- `apps/api/src/feature-flags/feature-flags.spec.ts` e `apps/api/src/health/version.controller.spec.ts` (AC-06, AC-07): RED com 10 falhas por asserção (`api-red.json`), GREEN em `api-green.json`.
- `apps/web/src/hooks/useFeatureFlag.test.tsx` (AC-07): RED com 3 falhas por asserção (`web-red.json`), GREEN em `web-green.json`.
- O coletor aceita um comando por par e o manifest um par. O par oficial é o da ferramenta de release; os pares da API e do front foram gravados pelo mesmo coletor e ficam como evidência auxiliar, com AC-06 e AC-07 marcados sem TDD obrigatório no manifest por esse motivo.
- AC-08 a AC-10: execução real na VPS, registrada no PR.

## Riscos e exclusões

- O primeiro deploy pelo fluxo novo troca os containers de produção para as imagens nomeadas por commit. Não há como ensaiar o job de Produção antes do merge.
- Staging e produção dividem CPU, memória e disco da mesma VPS; o build das imagens passa a acontecer antes do staging, com produção no ar.
- As imagens existem só no servidor. Perda do servidor exige reconstruir a partir do commit.
- A promoção automática depois do staging vale enquanto o environment `production` não tiver revisores obrigatórios.
- O smoke do staging cobre login, sessão e lista de tickets; a suíte Playwright completa segue só no CI.
- A troca dos containers ainda causa alguns segundos de indisponibilidade.
- Migrações precisam seguir expandir e contrair para o rollback do aplicativo ser seguro; isso é conferido na revisão, não por check.

## Ticket único

T1: ferramenta de release e testes, Compose e Dockerfiles, workflows, versão e feature flags na API e no front, E2E isolado, skills e documentação (AC-01 a AC-11).
