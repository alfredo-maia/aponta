import { Role } from '@prisma/client';
import { PERMISSION_KEYS } from './permission-catalog';

/**
 * DMTE-84 (Tarefa 1): one default PermissionGroup per legacy Role enum
 * value, so every existing user has a real, visible permission group the
 * moment the feature ships — not an empty list. ADMIN gets every catalog
 * permission; AGENT gets the operational subset; CLIENT gets nothing (the
 * client portal's own ability checks are unrelated to this catalog).
 *
 * DMTE-126 (retrabalho da Tarefa 2, QA rejeitou DMTE-121): a primeira
 * versão só copiou o que fazia sentido "à mão" e deixou buracos reais —
 * o enforcement já trocou de `RolesGuard`/`@Roles` para `PermissionsGuard`/
 * `@RequirePermission` nesta mesma branch, então uma chave ausente aqui é
 * perda de acesso em produção, não hipotética. As listas abaixo foram
 * recalculadas pelo cruzamento completo de `grep -rn "@RequirePermission("
 * apps/api/src` contra o `@Roles(...)` que existia no commit `d729bf9`
 * (pré-Tarefa 2, 105 ocorrências em 20 controllers) — ver o comentário em
 * `seed.spec.ts` para a tabela completa chave-por-chave.
 *
 * Duas decisões de produto ficam registradas aqui porque o cruzamento as
 * expôs (mesmo não sendo, estritamente, "gaps" de acesso perdido):
 *  - EDIT_TICKETS agora é uma única chave para update/assign/changeStage/
 *    changeStatus/cancel/updateParent; `cancel` e `updateParent` já
 *    incluíam AGENT_MASTER no @Roles antigo, então a chave única também
 *    concede a AGENT_MASTER as outras ações (update/assign/changeStage/
 *    changeStatus) que antes eram só AGENT/ADMIN. Decisão: manter —
 *    AGENT_MASTER é hierarquicamente superior a AGENT, então ganhar essa
 *    capacidade é razoável, não uma regressão de segurança.
 *  - MANAGE_SERVICE_CATALOGS, MANAGE_SERVICE_DESKS e
 *    VIEW_CLIENT_CONSUMPTION_STATEMENT_REPORT cada uma cobre, com a MESMA
 *    chave, tanto um endpoint que era ADMIN-only quanto outro que também
 *    liberava AGENT/AGENT_MASTER/CLIENT_MASTER — dar a chave a esses
 *    papéis para restaurar o acesso que tinham também amplia o alcance
 *    deles para o endpoint que antes era só-ADMIN (ex.: AGENT_MASTER
 *    ganha CRUD completo de Service Desks, não só import de feriados e
 *    business-hours). Inerente à granularidade de chaves definida na
 *    Tarefa 2 (catálogo de ~86 chaves, não um-para-um por endpoint);
 *    dividir a chave fica fora do escopo deste retrabalho do seed.
 *  - MANAGE_KNOWLEDGE_BASE dá a AGENT (igual a AGENT_MASTER/ADMIN) poder de
 *    excluir artigos da Base de Conhecimento (`articles.controller.ts`'s
 *    `remove`), que no `@Roles` antigo era ADMIN-only (`create`/`update`
 *    eram AGENT/AGENT_MASTER/ADMIN, mas `remove` não incluía AGENT).
 *    Decisão (DMTE-128, 2ª rodada de QA): manter — over-grant de risco
 *    baixo-médio, aceitável para conteúdo de base de conhecimento (não é
 *    dado sensível como credenciais/financeiro), e dividir a chave só
 *    para isolar `remove` fica fora do escopo deste retrabalho.
 *
 * DMTE-128 (retrabalho da Tarefa 2, QA rejeitou DMTE-126, 2ª rodada):
 * três escalações de privilégio reais, verificadas endpoint a endpoint:
 *  - CREATE_TICKET_SCHEDULING dava a CLIENT_MASTER poder de criar/editar/
 *    excluir compromissos na Agenda (`agenda.controller.ts`'s `create`/
 *    `update`/`remove`), que ele nunca teve — no `@Roles` antigo esses
 *    handlers eram só ADMIN/AGENT_MASTER/AGENT; CLIENT_MASTER só tinha os
 *    GETs via VIEW_ALL_SCHEDULES. Corrigido: removida de CLIENT_MASTER.
 *  - MANAGE_PASSWORD_VAULT dava a AGENT/AGENT_MASTER CRUD completo de
 *    credenciais de senha + visibilidade da trilha de auditoria, não só
 *    leitura/revelação que tinham antes (`vault.controller.ts` usava a
 *    mesma chave nos 10 endpoints; no `@Roles` antigo só
 *    `findFolders`/`findCredentials`/`reveal` eram
 *    ADMIN+AGENT_MASTER+AGENT — as demais ações, incluindo `findAudit`,
 *    eram ADMIN-only). Corrigido indo pela opção mais segura por padrão
 *    (dado de credencial): a chave única foi dividida em 3
 *    (`permission-catalog.ts`, categoria TECHNICAL) —
 *    VIEW_PASSWORD_VAULT (leitura/revelação), MANAGE_PASSWORD_VAULT
 *    (agora só escrita: create/update/remove de pastas e credenciais) e
 *    VIEW_PASSWORD_VAULT_AUDIT (`findAudit`, ADMIN-only). AGENT/
 *    AGENT_MASTER ganham só VIEW_PASSWORD_VAULT; ADMIN ganha as 3 (via
 *    spread de todo o catálogo, abaixo).
 *
 * DMTE-133 (retrabalho da Tarefa 2 apontado pelo E2E real da Tarefa 3):
 * movido de `prisma/seed.ts` para `src/` para que `UsersService.create`
 * (todo usuário novo, não só os 2 usuários fixos do seed) possa linkar ao
 * mesmo grupo padrão — ver `ROLE_GROUP_NAME` abaixo.
 */
export const DEFAULT_PERMISSION_GROUPS: Record<Role, { description: string; permissions: string[] }> = {
  [Role.ADMIN]: {
    description: 'Acesso administrativo completo (grupo padrão migrado do papel ADMIN)',
    permissions: [...PERMISSION_KEYS],
  },
  [Role.AGENT_MASTER]: {
    description: 'Gestão de atendimento (grupo padrão migrado do papel AGENT_MASTER)',
    permissions: [
      'VIEW_AND_OPEN_TICKETS',
      'CREATE_EDIT_WORKLOGS',
      'EDIT_TICKETS',
      'EDIT_ALL_WORKLOGS',
      'VIEW_ADD_INTERNAL_COMMUNICATION',
      'MANAGE_KNOWLEDGE_BASE',
      'PAUSE_RESUME_SLA',
      'ACCESS_CHAT',
      'VIEW_AGENT_REPORTS',
      'VIEW_USERS_IN_AGENT_REPORTS',
      'VIEW_ALL_SCHEDULES',
      'CREATE_TICKET_SCHEDULING',
      'VIEW_PASSWORD_VAULT',
      'VIEW_CONTRACTS_ADMIN',
      'MANAGE_CHECKLISTS',
      'ADD_SLA_TIME',
      'MANAGE_SERVICE_CATALOGS',
      'MANAGE_SERVICE_DESKS',
    ],
  },
  [Role.AGENT]: {
    description: 'Atendimento operacional (grupo padrão migrado do papel AGENT)',
    permissions: [
      'VIEW_AND_OPEN_TICKETS',
      'CREATE_EDIT_WORKLOGS',
      'EDIT_TICKETS',
      'VIEW_ADD_INTERNAL_COMMUNICATION',
      'ACCESS_CHAT',
      'VIEW_ALL_SCHEDULES',
      'CREATE_TICKET_SCHEDULING',
      'VIEW_PASSWORD_VAULT',
      'MANAGE_CHECKLISTS',
      'MANAGE_KNOWLEDGE_BASE',
      'VIEW_AGENT_REPORTS',
      'VIEW_CONTRACTS_ADMIN',
      'ADD_SLA_TIME',
      'MANAGE_SERVICE_CATALOGS',
    ],
  },
  [Role.CLIENT_MASTER]: {
    description: 'Cliente com visão da organização (grupo padrão migrado do papel CLIENT_MASTER)',
    permissions: [
      'ACCESS_CLIENT_PORTAL',
      'VIEW_ALL_CLIENT_TICKETS',
      'UPLOAD_TICKET_ATTACHMENTS',
      'VIEW_ALL_SCHEDULES',
      'VIEW_CONTRACTS_CLIENT',
      'VIEW_CLIENT_CONSUMPTION_STATEMENT_REPORT',
      'VIEW_LAST_30_DAYS_TICKETS_WIDGET',
      'VIEW_WORKLOG_INFO',
    ],
  },
  [Role.CLIENT]: {
    description: 'Cliente isolado (grupo padrão migrado do papel CLIENT)',
    permissions: ['ACCESS_CLIENT_PORTAL', 'UPLOAD_TICKET_ATTACHMENTS', 'VIEW_LAST_30_DAYS_TICKETS_WIDGET'],
  },
};

export const ROLE_GROUP_NAME: Record<Role, string> = {
  [Role.ADMIN]: 'Administrador',
  [Role.AGENT_MASTER]: 'Gerente de Atendimento',
  [Role.AGENT]: 'Atendente',
  [Role.CLIENT_MASTER]: 'Cliente Master',
  [Role.CLIENT]: 'Cliente',
};
