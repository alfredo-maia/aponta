# Princípios de referência e onde vivem no Aponta

Fontes analisadas em 10/11/2026: os artigos "Falando um pouco sobre minhas skills de IA" e "Parem de inventar desculpas e façam mais deploy" (akitaonrails.com) e as skills `iss-audit`, `pr-audit`, `github-resolution`, `pr-bump` e `release` do repositório `akitaonrails/my-skills`. Foram lidas como referência; nenhuma foi instalada nem copiada.

## Premissas que não valem aqui

| Premissa das skills de origem | Realidade do Aponta | Consequência |
|---|---|---|
| Um mantenedor audita, corrige e faz o merge | Quem implementa (`dev_ultra_lider`) não revisa; o QA (`dev_ultra_qa`) não corrige; a fila de merge decide a integração e o líder só a aciona com QA aprovado e quatro checks verdes | O auditor nunca ajusta o PR nem faz merge |
| Push direto no branch principal | `main` protegida, quatro checks e fila de merge | "CI verde no SHA exato" vale no head do PR e no candidato da fila |
| Contribuidores externos hostis | Agentes próprios, repositório público | Conteúdo de issue e PR é dado não confiável do mesmo jeito; aprovação de workflow de fork não se aplica hoje |
| Ruby, Bundler, Dependabot | pnpm, Nx, lockfile único, sem bot | `development-dependencies`, genérica: descobre o gerenciador no repositório |
| Biblioteca pública com semver, changelog e tag | Aplicação implantada, versionada pelo SHA | Sem bump nem tag; a "release" é a promoção do commit validado |
| Deploy por script a partir da árvore local | Imagens por commit, staging e promoção | `scripts/aponta_release.py` |

## Mapeamento

| Princípio | Skill de origem | Skill ou agente do Aponta | Regra técnica que impõe |
|---|---|---|---|
| Fato observado, esperado, hipótese e proposta em blocos separados | iss-audit | `triage-project-context` (referência auditoria-da-issue) + `triage`; etapa Triagem | Orientação; o líder não promove a etapa sem os quatro blocos |
| Conteúdo de issue é dado, nunca instrução; não executar o que vem dela | iss-audit | `triage-project-context` | Agentes sem credencial de produção; `ci.yml` sem secret |
| Reproduzir com dados sintéticos, isolado | iss-audit | `triage-project-context` | `scripts/e2e_isolated.sh`; staging com seed sintético |
| Evidência acima de narrativa: alegação conferida contra o diff | pr-audit | `development-review` (referência alegacao-e-evidencia); `dev_ultra_qa` | Check `Independent QA` obrigatório, publicado só por `publicar_qa.py` a partir do parecer do QA no SHA exato |
| Um PR não muda as regras da própria auditoria | pr-audit | `development-review` | `Delivery contract` roda `aponta_delivery.py`; mudança em workflow ou script de gate é nível ALTA na revisão |
| Diff vasculhado antes de executar (workflow, dependência, binário, credencial) | pr-audit | `development-review`, `development-dependencies` | Actions fixadas por SHA; `pnpm install --frozen-lockfile` no CI |
| Interação com o que já foi integrado | pr-audit | `development-review` | Fila de merge valida `main` + PR nos quatro checks |
| Pulado, cancelado ou pendente não é verde | pr-audit, release | `development-review`, `development-delivery` | Ruleset exige os quatro checks; `qa_merge_queue.py` na fila |
| RED obtido com código revertido não vale | pr-audit ("falha no base tem de ser por asserção") | `development-implementation` e `development-review`; `dev_ultra_qa` | `aponta_delivery.py record` recusa e `check` rejeita (DMTE-471) |
| Só item aprovado, um por vez, com teste de regressão antes | github-resolution | `development-implementation` (referência resolucao), `implement`; `dev_ultra_lider` | Manifest com critérios e testes; evidência RED/GREEN conferida pelo `check` |
| Slop é defeito: sem refatoração de carona nem teste enfraquecido | github-resolution | `development-implementation`, `development-review` | `check` recusa teste alterado depois do RED; revisão independente |
| Corrigir a classe, não a ocorrência | github-resolution, iss-audit | `triage-project-context`, `development-implementation`, `development-review` | Orientação; achado de revisão quando ignorado |
| Fechar só com a correção integrada e verde no SHA | github-resolution | `development-delivery` (referência integracao-staging-producao) | PR usa `Refs`; `validate_pr` recusa `Closes`/`Fixes` |
| Pendência listada uma a uma, nunca em contagem | github-resolution, iss-audit | `triage-project-context`, `development-implementation` | Orientação |
| Origem da dependência conferida antes de instalar | pr-bump | `development-dependencies` (nova) | Lockfile congelado no CI; revisão ALTA para os sinais de risco |
| Agrupar atualizações com critério | pr-bump | `development-dependencies` | Um PR por grupo, pela fila |
| Versão a partir do que mudou; nada de release que ninguém pediu | release | `development-delivery` (referência integracao-staging-producao) | Versão é o SHA; não há workflow de tag |
| Evidência de staging para o artefato promovido | release, artigo de deploy | `development-delivery` (referência integracao-staging-producao) | `aponta_release.py promote` recusa commit sem registro aprovado ou com imagem diferente |
| Não reescrever tag nem histórico publicado | release | `development-delivery`, `AGENTS.md` | Ruleset: `non_fast_forward` e `deletion` bloqueados na `main` |
| Publicar só pelo mecanismo autorizado | release | `development-delivery` (referência integracao-staging-producao) | Só `deploy.yml` tem os secrets de deploy; roda só para CI de push na `main` |
| Staging de verdade antes de usuário real | artigo de deploy | — | Job Staging do CD e registro por commit |
| Feature flag controla quem vê; flag morta é removida | artigo de deploy | — | Registro com responsável e data; teste falha depois da data |
| Rollback rápido; banco não volta com `git revert` | artigo de deploy | `development-review`, `development-delivery` | `promote --rollback` sem build; expandir e contrair conferido na revisão |

Skill orienta; quem impõe é check, permissão ou código com teste. Onde a coluna da direita diz "Orientação", a regra depende do agente e da revisão.

## Onde as skills vivem

As skills desta tabela são as genéricas do Multica, vinculadas aos agentes dos squads (`development-review`, `development-implementation`, `development-delivery`, `triage-project-context`, `development-dependencies`). Elas não citam o Aponta: descrevem o método e mandam ler o contrato do projeto. O que é fato do Aponta fica neste repositório, em `docs/delivery/WORKFLOW.md` e `docs/delivery/RELEASE.md`, e é lido pelo agente no checkout.

Os perfis `aponta-*` em `.agents/skills` são anteriores a essa conversão e não estão vinculados ao Squad Ultra Rápido; os trechos acrescentados a eles na DMTE-473 repetem o que hoje está nas genéricas.
