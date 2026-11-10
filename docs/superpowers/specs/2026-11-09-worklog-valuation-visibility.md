# SPEC — Apontamento do ticket: ocultar tipo de valorização (DMTE-463)

Decisões humanas (Multica DMTE-463): consultor não vê o tipo de valorização; Garantia só por grupo de permissão; permissão nova `LAUNCH_WORKLOG_GUARANTEE`, sem concessão padrão a nenhum grupo (aprovado). Tier 2.

## Critérios de aceite
- AC-01: `LAUNCH_WORKLOG_GUARANTEE` existe no catálogo (categoria técnica) e nenhum grupo padrão a recebe.
- AC-02: API: `POST /tickets/:id/worklogs` com `valuationType=GUARANTEE` retorna 403 para não-ADMIN sem a permissão; ADMIN e quem tem a permissão lançam. Bonificação segue só ADMIN.
- AC-03: Web: o campo "Tipo de Valorização" e o rótulo do tipo na listagem e o detalhe expandido aparecem só para ADMIN ou quem tem a permissão.
- AC-04: Web: sem a permissão, o apontamento é enviado como `CONTRACT`; vale também com rascunho antigo e com as permissões ainda não carregadas ou com falha; o botão Salvar fica desabilitado enquanto elas carregam.
- AC-05: Fora do escopo: Bonificação/Valor manual, modalidade de contrato no nome do contrato.

## Riscos
Quem hoje lança Garantia sem a permissão passa a receber 403/perder a opção até o grupo receber a chave. Ocultar o campo no web não substitui a regra da API (AC-02).

## Testes
`worklogs.service.spec.ts` (AC-02), `TicketWorklogs.test.tsx` (AC-03, AC-04).
