# Princípios nas skills genéricas, sem perfis específicos do Aponta

Identidade: DMTE-474, issue dmrepositorio/aponta#180, Tier 1, ciclo 2026-11-09/2026-11-22. Correção da DMTE-473, apontada pelo usuário em 11/11/2026.

## Situação

A DMTE-473 criou `aponta-triage` e `aponta-deps` e pôs princípios de auditoria e release nos perfis `aponta-*`. O Squad Ultra Rápido não carrega esses perfis; usa as skills genéricas do Multica, que foram convertidas de específicas para genéricas de propósito.

## Decisão

Os princípios ficam nas skills genéricas do Multica, sem citar o Aponta. O repositório remove os dois perfis criados e corrige as referências.

## Acceptance criteria

- AC-01: `aponta-triage` e `aponta-deps` não existem em `.agents/skills`, e nenhum documento do repositório os cita como skill em uso.
- AC-02: `docs/agents/akita-mapping.md` aponta cada princípio para a skill genérica que o agente carrega e explica onde as skills vivem.

## Testes

Sem comportamento: `check_engineering_skills.py`, `check_matt_workflow.py` e busca por referências.
