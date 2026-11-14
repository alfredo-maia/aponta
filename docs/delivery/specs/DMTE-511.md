# Minha Conta: resposta tardia de GET /auth/me sobrescrevia o que o usuário digitou

Identidade: DMTE-511, issue dmrepositorio/aponta#255, Tier 2, ciclo 2026-11-09/2026-11-22.

## Situação

O teste E2E `apps/web-e2e/src/auth.spec.ts` ("a user can update their name and email from Minha Conta") falhava de forma intermitente só no CI de push da `main`, sempre em `expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.')`. Em 2026-11-13 falhou em 4 dos 8 CIs de push e segurou o `CD (Produção)` de quatro entregas.

## Causa raiz (código observado + trace)

`ProfileTab` em `apps/web/src/pages/MyAccountPage.tsx` busca `GET /auth/me` num `useEffect` e chama `reset({ name, email })` quando a resposta chega. O formulário já está editável antes disso, e o `reset` substitui todos os valores, inclusive os que o usuário já digitou.

Trace da run 43529645398, tentativa 1 (artefato `playwright-report-43529645398-1`), observado:

- o `PATCH /auth/me` saiu com nome e e-mail **antigos**, corpo idêntico à resposta do `GET /auth/me`; o servidor respondeu 200;
- o toast "Dados atualizados com sucesso!" apareceu, porque `setSuccess(true)` roda depois do `PATCH` 200;
- o e-mail nunca mudou, então o login com o e-mail antigo teve sucesso (`POST /auth/login` 201), foi para `/` e nenhum alerta apareceu.

Com a API fria no CI a resposta chega depois do preenchimento; local, ela chega antes e o teste passa. É defeito de produto: o usuário perde o que digitou e recebe confirmação de um salvamento que não mudou nada. Hipóteses descartadas: toast antes da persistência (o toast só vem depois do `await`); alerta sem `role="alert"` (`EzAlert` sempre o define); interferência da barra de abas (ausente do trace).

Os testes unitários de `MyAccountPage.test.tsx` esperam `findByDisplayValue('Jane Doe')` antes de digitar e por isso nunca exercitaram a corrida.

## Decisão (proposta do planejamento, dentro do pedido do card)

Em `ProfileTab`, o `reset` vindo do `GET /auth/me` passa a preservar os campos que o usuário já alterou (`reset(values, { keepDirtyValues: true })` do react-hook-form): campos intocados recebem o valor do servidor, campos alterados mantêm o que foi digitado. Sem mudança de API, de DS ou de `playwright.config.ts`; sem `retries` nem aumento de timeout.

O E2E existente fica como está: com o produto corrigido ele passa independentemente de quando o `GET /auth/me` responde. Entra um E2E determinístico (`page.route` atrasa `GET /api/auth/me`) que reproduz a corrida em vez de depender da lentidão do CI.

## Acceptance criteria

- AC-01: `auth.spec.ts` ("update their name and email from Minha Conta") roda 20 vezes seguidas em verde (`--repeat-each 20`), com evidência no PR.
- AC-02: a causa raiz está explicada no PR e nesta SPEC, com o trace da falha como evidência.
- AC-03: teste unitário cobre a corrida (resposta tardia de `GET /auth/me` depois de o usuário digitar nome e e-mail): o `PATCH` leva os valores digitados. RED antes da correção, no fluxo de TDD do contrato.
- AC-04: nenhuma outra spec E2E muda de comportamento; o job E2E completo continua verde.
- AC-05: `playwright.config.ts` sem `retries` novo.

## Testes

- AC-01: `pnpm exec nx run web-e2e:e2e --skip-nx-cache -- src/auth.spec.ts --repeat-each 20` pelo `scripts/e2e_isolated.sh`; no CI, o job E2E do PR.
- AC-02: esta SPEC e o corpo do PR.
- AC-03: `apps/web/src/pages/MyAccountPage.test.tsx`, caso "keeps what the user typed when GET /auth/me responds late"; RED e GREEN pelo coletor.
- AC-04: job E2E completo no CI; diff do PR só em `MyAccountPage.tsx`, `MyAccountPage.test.tsx` e `auth.spec.ts`.
- AC-05: `git diff` do PR não toca `apps/web-e2e/playwright.config.ts`.

## Riscos

- Campo "sujo" mantém o valor digitado mesmo que o servidor tenha outro mais novo: aceitável, é o que o usuário escreveu e o salvamento é explícito.
- Usuário que digita o mesmo valor que o padrão inicial não marca o campo como alterado e recebe o valor do servidor; para e-mail e nome o resultado é equivalente ao valor atual da conta.
- Sem impacto em RBAC, tenant ou API: a tela só chama `/auth/me` do próprio usuário.
