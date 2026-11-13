# Abas: Tickets fechável e aba ativa com destaque verde

Identidade: DMTE-501, issue dmrepositorio/aponta#245, Tier 1, ciclo 2026-11-09/2026-11-22. Decisões do usuário em 13/11/2026 (comentário no DMTE-501). Dispensa do Architect: Tier 1 com critérios confirmados pelo usuário (`docs/delivery/WORKFLOW.md`).

## Situação

A barra de abas (`TabBar`, `TabsContext`) tem a aba "Tickets" fixa, sem botão de fechar, por decisão **D2** de `docs/superpowers/specs/2026-10-23-tickets-panel-general-review.md` ("aba fixa Tickets"). As outras abas (ticket, Busca avançada, Dashboard) fecham pelo X. A aba ativa usa `border-gray-200 bg-gray-80 text-gray-900`, sem verde. O link "Tickets" da lateral só navega para `/` (`Sidebar.tsx`, `goToItem`).

## Decisão

- **Reversão da D2:** a aba "Tickets" deixa de ser fixa e passa a fechar como qualquer outra. A D2 continua valendo no resto (abrir ticket, Busca avançada e Novo ticket criam ou ativam aba sem duplicar, fechar a ativa vai para a vizinha, persistência em `sessionStorage`).
- **Comportamento A:** qualquer aba fecha, menos a última que sobrar (sem X e sem efeito ao chamar `closeTab`). O link "Tickets" da lateral reabre a aba se foi fechada e só ativa a existente se está aberta, sem duplicar. Sem aba aberta nunca há barra vazia.
- **Verde:** aba ativa com o padrão do `EzTabs` (`bg-brand-100 text-brand-700`), borda `border-brand-200`, só tokens `brand-*` (ADR `docs/adr/0001-paleta-unica-brand-na-aba-tickets.md`). `text-brand-700` sobre `bg-brand-100` dá cerca de 4,8:1 (`#00684c` sobre `#bddfd6`, cálculo WCAG).
- O campo `closable` sai de `AppTab`; o X aparece quando há mais de uma aba. Abas já salvas em `sessionStorage` com `closable: false` passam a fechar (o campo antigo é ignorado).

## Acceptance criteria

- AC-01: com duas ou mais abas abertas, toda aba, inclusive "Tickets", mostra o botão "Fechar aba"; com uma só aba, ela não mostra o botão e `closeTab` nela não a remove.
- AC-02: fechar a aba "Tickets" a remove; se era a ativa, a navegação vai para a vizinha, e se não era, a rota atual não muda.
- AC-03: clicar em "Tickets" na lateral com a aba fechada a reabre e ativa; com ela aberta, ativa sem criar segunda aba.
- AC-04: a aba ativa tem `bg-brand-100`, `text-brand-700` e `border-brand-200`; a inativa não tem `bg-brand-100`; nenhuma classe `gray-80` nem hex literal na aba ativa.
- AC-05: abas salvas na sessão com `closable: false` (formato antigo) fecham normalmente.

## Testes

Vitest + Testing Library em `apps/web/src/contexts/TabsContext.test.tsx`, `apps/web/src/components/layout/TabBar.test.tsx` e `apps/web/src/components/layout/AppLayout.test.tsx`; cada teste novo leva o prefixo `DMTE-501 AC-NN:`. Os testes antigos que travam a aba fixa (D2) mudam junto com a decisão. Seams: `useTabs`/`TabsProvider` (estado), `TabBar` (renderização e classes) e `AppLayout` com `Sidebar` (reabrir). Sem story nova: nenhum componente reutilizável do DS muda (`TabBar` é de layout).

## Fora de escopo

Persistência além da sessão, reordenar abas, foco visível do botão de fechar, qualquer outra tela. Aceite visual é do usuário depois de publicado.
