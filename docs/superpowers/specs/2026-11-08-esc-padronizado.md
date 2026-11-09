## Problem Statement

Na interface do Aponta, a tecla Esc se comporta de forma desigual. Alguns modais fecham com Esc, mas diálogos, popups, popovers, o painel de filtros, o modal de configuração de tela, o diálogo do cofre e as telas com botão "Voltar" ignoram a tecla. Como cada componente registra o próprio `keydown` sem ordem entre eles, com um modal aberto sobre uma tela um único Esc pode fechar mais de uma camada. O usuário não consegue prever o que o Esc vai fazer.

## Solution

Esc passa a seguir o padrão de mercado em toda a interface: cada pressionamento age sobre uma única camada, a mais ao topo. Se há uma sobreposição aberta (modal, diálogo, popup, popover, drawer, menu retrátil), ela fecha. Se não há sobreposição e a tela tem "Voltar", Esc volta. Em campo de edição, Esc só cancela a edição. Em formulário com alterações não salvas, Esc pede confirmação antes de descartar.

## User Stories

1. Como atendente, quero fechar qualquer modal, diálogo ou popup com Esc, para não precisar do mouse.
2. Como atendente, quero que Esc feche só a sobreposição mais ao topo, para não perder o contexto da camada de baixo.
3. Como atendente, quero que Esc feche o painel de filtros lateral, para voltar à grade rapidamente.
4. Como atendente, quero que Esc no detalhe do ticket volte à grade, para navegar só pelo teclado.
5. Como administrador, quero que Esc em "Voltar para a lista" (Usuários, Grupos Técnicos, Grupos de Permissão) volte à lista.
6. Como atendente, quero que Esc no formulário de ticket ("Voltar à Grade") e na criação de ticket volte para a tela anterior.
7. Como usuário, quero que Esc dentro de um campo em edição apenas cancele a edição, para não sair da tela por engano.
8. Como usuário, quero ser avisado quando Esc descartaria alterações não salvas, para não perder trabalho.
9. Como usuário de celular com teclado externo, quero que o menu retrátil continue fechando com Esc.
10. Como pessoa que usa leitor de tela, quero que o foco volte ao elemento que abriu a camada ao fechá-la com Esc.
11. Como usuário, quero que Esc não faça nada quando já estou na tela inicial e não há sobreposição.
12. Como desenvolvedor do DS, quero um único mecanismo de Esc, para que componentes novos herdem o comportamento sem código próprio.

## Implementation Decisions

- Mecanismo único no DS: uma pilha de camadas de Esc (sobreposições e telas com "Voltar") com um único listener de `keydown` no documento. Cada Esc é tratado por exatamente uma camada, a do topo; o evento é consumido.
- Ordem de prioridade: (1) edição em campo (cancelar edição); (2) sobreposição aberta; (3) "Voltar" da tela; (4) nada.
- Esc ignorado quando `event.defaultPrevented`, durante composição de texto (IME) e com teclas modificadoras.
- Dentro de `input`, `textarea`, `select` e editores com edição ativa, o Esc é do campo (cancela a edição, como `EzTextEdit` já faz) e não propaga para camadas de baixo.
- Alterações não salvas: a camada pode declarar "sujo"; nesse caso Esc abre diálogo de confirmação (Descartar / Continuar editando) em vez de fechar ou voltar. A confirmação é ela mesma uma camada, e Esc nela equivale a "Continuar editando".
- Aplicação a todos os componentes e telas atuais (decisão humana confirmada): `EzModal`, os cinco painéis/modais de `EzEntityGrid`, `EzDialog`, `EzPopup`, `EzPopoverPlus`, `EzFilterDrawer`, `EzEntityScreenConfigModal`, diálogo do `VaultPage`, menu retrátil do `AppLayout`; e telas com "Voltar": detalhe de ticket, formulário de ticket, criação de ticket, Usuários, Grupos Técnicos, Grupos de Permissão, via `EzPageLayout`/`EzSimpleBar` quando possível.
- Ao fechar por Esc, o foco retorna ao elemento que abriu a camada.
- Os listeners locais de Esc atuais são removidos, substituídos pelo mecanismo único.
- Sem mudança de API HTTP, banco, RBAC ou tenant. Reaproveitar tokens e componentes do DS; sem Carbon ou Next.js.

## Testing Decisions

- Seam principal (mais alto possível): comportamento observável no DOM com Testing Library, disparando `keydown` Esc no documento e verificando qual camada fecha ou se a rota volta. Um único conjunto de testes do mecanismo cobre a pilha; cada componente tem um teste curto de "fecha com Esc".
- Um bom teste verifica apenas efeito externo (elemento visível/ausente, rota atual, foco), nunca a estrutura interna da pilha.
- Prior art: `EzModal.test.tsx`, `AppLayout.test.tsx`, `EzGrid.test.tsx` no mesmo runner (Vitest).
- Matriz de aceite (ACs numerados):
  - AC-1: Esc fecha a sobreposição do topo e só ela (modal sobre modal, drawer sobre página).
  - AC-2: cada componente listado fecha com Esc.
  - AC-3: sem sobreposição, Esc nas telas com "Voltar" volta; na tela inicial não faz nada.
  - AC-4: foco em campo em edição: Esc cancela a edição e não fecha nem volta.
  - AC-5: camada suja: Esc abre confirmação; Esc na confirmação mantém a edição; confirmar descarta.
  - AC-6: Esc com `defaultPrevented`, IME ou modificador é ignorado.
  - AC-7: foco retorna ao gatilho após fechar.
  - AC-8: nenhum listener de Esc local remanescente nos componentes listados.
  - AC-9: story do mecanismo/componente alterado no Storybook, ou exceção documentada.
- Riscos: dois componentes que hoje já fecham com Esc passarem a fechar duas vezes durante a migração (mitigado por AC-8 e por migrar com remoção do listener antigo no mesmo commit); popovers renderizados em portal; campos `EzTextEdit` com cancelamento próprio. Sem impacto em RBAC, tenant ou dados.
- Validação visual e aceite humano são distintos dos testes automatizados.

## Out of Scope

- Atalhos de teclado além do Esc (Enter, setas, Ctrl+K etc.).
- Botão "Voltar" do navegador e histórico de navegação.
- Redesenho visual dos modais, drawers e telas.
- Qualquer mudança de backend, RBAC, banco ou deploy.
