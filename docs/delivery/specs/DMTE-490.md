## Problem Statement

Quem atende um ticket que depende de um chamado aberto na Sankhya não tem como marcar isso: o status mais próximo é "Aguardando Terceiros", que mistura a Sankhya com qualquer outro terceiro, e o relógio de SLA continua correndo sem culpa do atendente. Além disso, os seletores do sistema são `<select>` nativos: a lista aberta é desenhada pelo navegador (cinza escuro, fonte do sistema) e destoa do restante da tela, "parecendo HTML puro". O formulário do ticket ainda oferece uma lista de status diferente da do detalhe (rótulos "Em Espera" e "Pendente Cliente", sem "Aguardando Aprovação").

Identidade: DMTE-490 (Multica), Tier 3, ciclo 2026-11-09/2026-11-22. Origem: pedido do usuário na própria DMTE-490, com as decisões das rodadas 1 e 2 de perguntas (Q1 a Q10, todas respondidas).

## Solution

1. Um novo status de ticket, **Aguardando Sankhya** (termo no `GLOSSARY.md`), que se comporta como Aguardando Terceiros: entra a partir de Em Andamento, volta para Em Andamento ou vai para Resolvido, pausa o SLA e conta como "Pausado". Aparece na mesma posição lógica (logo depois de Aguardando Terceiros) no detalhe, no formulário, na lista, no Kanban e no dashboard, com uma única lista e os mesmos rótulos em todas as telas. O perfil CLIENT continua só vendo o rótulo.
2. Um seletor de escolha única do DS, **EzSelect**, com lista própria, na paleta `brand-*`/`gray-*` do sistema, com teclado e acessibilidade. Todos os seletores do sistema passam a usá-lo: os dois combos do DS (`EzComboBox`, `EzClassicComboBox`) renderizam por ele, os `<select>` crus são trocados, e um verificador de CI impede `<select>` novo fora do `EzSelect`.

## User Stories

1. Como atendente, quero marcar um ticket como "Aguardando Sankhya", para registrar que estou esperando a resposta de um chamado aberto na Sankhya.
2. Como atendente, quero que o SLA pause enquanto o ticket está em "Aguardando Sankhya", para não ser cobrado por um prazo que não depende de mim.
3. Como atendente, quero retomar o ticket (Em Andamento) ou resolvê-lo direto a partir de "Aguardando Sankhya", para fechar o ciclo quando a Sankhya responde.
4. Como gestor, quero ver os tickets em "Aguardando Sankhya" no KPI "Pausados" e nos relatórios, para separar o que está parado por causa da Sankhya do que está parado por outros motivos.
5. Como atendente, quero ver "Aguardando Sankhya" no Kanban em coluna própria, depois de "Aguardando Terceiros", para arrastar e localizar esses tickets.
6. Como atendente, quero que o formulário do ticket ofereça os mesmos status, com os mesmos nomes, que o detalhe, para não ter dois vocabulários.
7. Como cliente, quero continuar vendo o status do meu ticket como texto, sem poder alterá-lo, como hoje.
8. Como usuário do sistema, quero listas de seleção com o mesmo visual do resto da tela, para o sistema parecer um produto só.
9. Como usuário de teclado, quero abrir, navegar (setas, Home, End), escolher (Enter) e fechar (Esc) qualquer seletor, para operar sem mouse.
10. Como usuário de leitor de tela, quero que cada seletor tenha rótulo e anuncie opção selecionada e estado aberto/fechado, para entender o controle.
11. Como pessoa que mantém o sistema, quero que um `<select>` novo fora do DS reprove no CI, para o padrão valer também para telas futuras.
12. Como pessoa que mantém o sistema, quero que `EzComboBox` e `EzClassicComboBox` mantenham a API atual, para os 86 usos herdarem o visual sem reescrita.

## Implementation Decisions

- Status novo `PENDING_SANKHYA` no enum de status do ticket, rótulo "Aguardando Sankhya", variante de tag `petroleum` (mesma família dos "aguardando").
- Transições: Em Andamento → Aguardando Sankhya; Aguardando Sankhya → Em Andamento ou Resolvido. As demais continuam rejeitadas, inclusive Aberto → Aguardando Sankhya.
- Pausa de SLA: o novo status entra no conjunto de status que pausam o SLA, tanto na regra de mudança de status quanto na política da mesa (`allowPauseResumeSla=false` também proíbe transições de e para ele). Hoje essa lista existe em dois lugares; a entrega as mantém coerentes (preferir uma fonte única se o custo for baixo).
- "Pausados": filtro `paused`, KPI do dashboard e relatórios incluem o novo status.
- Migração aditiva do enum (adicionar valor, sem alterar nem remover valores existentes e sem usar o valor na mesma migração). Reversão é parar de usar o valor, não removê-lo.
- Web: uma única fonte de rótulos, variantes e ordem de status, usada por detalhe, lista, Kanban, dashboard e formulário. Kanban ganha a coluna logo depois de Aguardando Terceiros.
- Perfil CLIENT: continua vendo o status como tag, sem seletor.
- `EzSelect` (DS): componente controlado de escolha única; props alinhadas a `EzComboBox` (label, message, hasError, disabled, required, id, className) e opções declaradas como `<option>` filhos, como hoje; lista própria renderizada num popover, com padrão ARIA de listbox (`role` listbox/option, `aria-expanded`, `aria-selected`, rótulo associado), teclado completo (setas, Home, End, Enter, Esc, tipo-para-buscar opcional) e foco visível por `focus-visible`. Mantém um `<select>` nativo escondido e sincronizado, para formulário e para os testes existentes (`selectOptions`, `selectOption`) funcionarem sem reescrita. Se o spike (T2) mostrar que o Playwright não usa o select escondido, os 15 pontos de E2E passam a usar um helper do `EzSelect`.
- Visual: paleta `brand-*` e `gray-*` do DS (ADR 0001), sem hex ou classes de cor fora do DS; altura, raio e tipografia dos combos atuais. Em celular o seletor também é o customizado (perde o seletor nativo do sistema), decisão do usuário.
- `EzComboBox` e `EzClassicComboBox` passam a renderizar `EzSelect` mantendo API, `ref` e o evento `onChange`.
- Os 16 `<select>` crus (12 em 8 telas e 4 em `EzEntityGrid` e `EzDynamicFilter`) viram `EzSelect`, preservando `id`, `data-testid`, `aria-label` e rótulos atuais.
- Verificador de CI, no estilo de `check_tickets_palette.py`: reprova `<select>` em TSX de produto fora do `EzSelect`, com teste do script e passo em `ci.yml`.
- Documentação: `docs/architecture/01-rbac-and-workflows.md` e `03-sankhya-ds-parity.md` ganham o status e o `EzSelect`.
- RBAC e tenant: sem mudança. A autorização de `changeStatus`, o isolamento por mesa/organização e os perfis continuam como estão; nenhum endpoint novo.
- Sem feature flag: o status novo não tem efeito externo (sem integração com a Sankhya).

## Acceptance criteria

T1 — status Aguardando Sankhya:
- AC-01: `changeStatus` aceita Em Andamento → Aguardando Sankhya e Aguardando Sankhya → Em Andamento/Resolvido, e rejeita as demais transições de e para o novo status (por exemplo Aberto → Aguardando Sankhya).
- AC-02: entrar em Aguardando Sankhya registra a pausa do SLA e sair dele a retoma; com `allowPauseResumeSla=false` na mesa, as transições de e para o novo status são proibidas.
- AC-03: o filtro `paused=true`, o KPI "Pausados" e os relatórios incluem tickets em Aguardando Sankhya.
- AC-04: a migração adiciona `PENDING_SANKHYA` ao enum de status sem alterar os valores existentes, e o schema Prisma o declara.
- AC-05: o detalhe, a lista, o Kanban e o dashboard exibem "Aguardando Sankhya" com o mesmo rótulo e variante, e o Kanban tem a coluna logo depois de "Aguardando Terceiros".
- AC-06: o formulário do ticket oferece todos os status com os mesmos rótulos do detalhe, incluindo Aguardando Aprovação e Aguardando Sankhya.
- AC-07: o perfil CLIENT vê o status como texto, sem seletor, inclusive com o novo status.

T2 — `EzSelect` no DS:
- AC-08: `EzSelect` abre uma lista própria, escolher uma opção por clique chama `onChange` com o valor e o valor controlado reflete na exibição fechada.
- AC-09: `EzSelect` responde a teclado: setas movem a opção ativa, Home e End vão ao primeiro e ao último, Enter escolhe e Esc fecha devolvendo o foco ao controle.
- AC-10: `EzSelect` expõe listbox/option com `aria-expanded` e `aria-selected`, tem rótulo associado, mostra estados desabilitado e de erro com mensagem, e tem foco visível, usando só a paleta do DS.
- AC-11: `EzComboBox` e `EzClassicComboBox` mantêm API, `ref` e `onChange` e renderizam por `EzSelect`; os testes existentes que usam `selectOptions` continuam passando sem reescrita.
- AC-12: o spike registra se o Playwright usa o select escondido (`selectOption`); se não usar, os pontos de E2E migram para um helper do `EzSelect`.
- AC-13: o Storybook do `EzSelect` mostra normal, selecionado, desabilitado, erro e lista longa.

T3 — troca geral e trava:
- AC-14: nenhum `<select>` cru resta em TSX de produto fora do `EzSelect`; os 16 seletores trocados mantêm `id`, `data-testid`, `aria-label` e rótulo.
- AC-15: o verificador de CI reprova `<select>` fora do `EzSelect` e passa na `main` após a troca; seu teste cobre os dois casos.
- AC-16: as suítes web e E2E ficam verdes após a troca.

## Testing Decisions

Um bom teste confere comportamento visível (o que o usuário vê, digita e escolhe, e o que a API devolve), não detalhe de implementação. Quatro seams, nessa ordem de preferência:

1. API: `tickets.service.spec` (Jest, Prisma mockado), seam existente de `changeStatus`, para AC-01 a AC-03; teste de contrato do schema e da migração para AC-04. Arte prévia: o caso de `ON_HOLD` no mesmo arquivo e `desk-policy.spec`.
2. Web, componente: `EzSelect.test.tsx` (Vitest + Testing Library), para AC-08 a AC-10, mais os testes atuais de `EzComboBox`/`EzClassicComboBox` para AC-11.
3. Web, tela: teste do detalhe e do formulário do ticket, para AC-05 a AC-07.
4. CI: teste Python do verificador (padrão de `test_check_tickets_palette.py`), para AC-15.

Storybook de `EzSelect` (AC-13) e E2E (AC-12, AC-16) são verificações adicionais, não substitutos dos testes. A aparência final do seletor tem aceite visual do usuário, que build e screenshot não substituem.

## Matriz AC → verificação esperada

| AC | Verificação |
|---|---|
| AC-01 a AC-03 | `tickets.service.spec`, `desk-policy.spec`, `reports.service.spec` |
| AC-04 | teste de contrato do schema e da migração |
| AC-05 a AC-07 | testes do detalhe, da lista, do Kanban, do dashboard e do formulário |
| AC-08 a AC-10 | `EzSelect.test.tsx` |
| AC-11 | testes de `EzComboBox`/`EzClassicComboBox` e suíte web inteira |
| AC-12 | spike no E2E isolado (`scripts/e2e_isolated.sh`) |
| AC-13 | build do Storybook |
| AC-14 a AC-16 | verificador de CI, suíte web, E2E |

## Out of Scope

- Integração real com a Sankhya (abrir ou consultar chamado por API): o status é um marcador manual.
- Número ou link do chamado Sankhya no ticket.
- Mudar a lista de transições dos outros status.
- Qualquer mudança de RBAC, tenant ou endpoint novo.
- Alterar o estágio por mesa (`TicketStage`), que é outro conceito.

## Further Notes

- Riscos: (a) o valor novo do enum é aditivo; a migração roda no deploy, que é do usuário (`docs/delivery/RELEASE.md`). (b) A troca de 16 seletores e dos dois combos toca muitos arquivos e testes (48 usos de `selectOptions` em 18 arquivos, 15 de `selectOption` no E2E): o PR traz um commit por ticket e um guia de revisão. (c) Perder o seletor nativo em celular é uma troca aceita. (d) `jsdom` não calcula layout, então o aceite visual é humano.
- Ordem de execução (WIP 1, um PR): T1, T2, T3; T3 é bloqueado por T2.
- Termo novo: **Aguardando Sankhya** (`GLOSSARY.md`). Sem ADR: a decisão de trocar o `<select>` nativo por lista própria é revertível e não é uma escolha entre alternativas difíceis de desfazer.
