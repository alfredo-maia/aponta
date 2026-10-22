import { Role } from '@prisma/client';
import { DEFAULT_PERMISSION_GROUPS } from './seed';

/**
 * DMTE-126 (retrabalho da Tarefa 2, DMTE-84): o QA rejeitou a primeira
 * versão porque DEFAULT_PERMISSION_GROUPS não cobria o superset real do
 * que `@Roles(...)` liberava antes do refactor para PermissionsGuard
 * (commit `d729bf9`, último estado pré-Tarefa 2). Este spec é o
 * cruzamento completo — toda chave `@RequirePermission(...)` hoje em uso
 * (`grep -rn "@RequirePermission(" apps/api/src`), cruzada com os
 * `@Roles(...)` antigos (105 ocorrências em 20 controllers) — não apenas
 * as 7 lacunas mínimas que o QA amostrou.
 *
 * Para uma chave usada isoladamente em um endpoint, o requisito é "todo
 * Role que tinha acesso ao endpoint via @Roles precisa ter a chave".
 * Para chaves combinadas com semântica OR em `@RequirePermission(a, b)`
 * (ex.: reports), o requisito é "todo Role que tinha acesso precisa de
 * PELO MENOS UMA das chaves do grupo" — não precisa ser a mesma chave
 * para todos, contanto que a semântica de negócio da chave escolhida
 * faça sentido para aquele Role (ex.: CLIENT_MASTER/CLIENT usam a chave
 * de categoria CLIENT do catálogo, não a de categoria ADMINISTRATIVE).
 */

const hasKey = (role: Role, key: string): boolean =>
  DEFAULT_PERMISSION_GROUPS[role].permissions.includes(key);

describe('DEFAULT_PERMISSION_GROUPS (DMTE-126)', () => {
  describe.each([
    // key, old @Roles(...) superset (commit d729bf9, pré-Tarefa 2)
    ['MANAGE_SERVICE_CATALOGS', [Role.ADMIN, Role.AGENT_MASTER, Role.AGENT]],
    // DMTE-128: MANAGE_PASSWORD_VAULT agora cobre só escrita (createFolder/
    // updateFolder/removeFolder/createCredential/updateCredential/
    // removeCredential), que no @Roles antigo era ADMIN-only. Leitura/
    // revelação ficou em VIEW_PASSWORD_VAULT (linha abaixo).
    ['MANAGE_PASSWORD_VAULT', [Role.ADMIN]],
    ['VIEW_PASSWORD_VAULT', [Role.ADMIN, Role.AGENT_MASTER, Role.AGENT]],
    ['VIEW_PASSWORD_VAULT_AUDIT', [Role.ADMIN]],
    ['EDIT_TICKETS', [Role.ADMIN, Role.AGENT, Role.AGENT_MASTER]],
    ['ADD_SLA_TIME', [Role.ADMIN, Role.AGENT, Role.AGENT_MASTER]],
    ['MANAGE_KNOWLEDGE_BASE', [Role.ADMIN, Role.AGENT_MASTER, Role.AGENT]],
    ['MANAGE_USERS', [Role.ADMIN]],
    ['VIEW_AND_OPEN_TICKETS', [Role.ADMIN, Role.AGENT]],
    ['CREATE_EDIT_WORKLOGS', [Role.ADMIN, Role.AGENT_MASTER, Role.AGENT]],
    ['MANAGE_BILLING', [Role.ADMIN]],
    ['VIEW_TICKET_VALUES', [Role.ADMIN]],
    ['VIEW_ADD_INTERNAL_COMMUNICATION', [Role.ADMIN, Role.AGENT]],
    ['VIEW_ALL_SCHEDULES', [Role.ADMIN, Role.AGENT_MASTER, Role.AGENT, Role.CLIENT_MASTER]],
    // DMTE-128: CREATE_TICKET_SCHEDULING cobre create/update/remove de
    // compromissos na Agenda. No @Roles antigo esses handlers eram só
    // ADMIN/AGENT_MASTER/AGENT — CLIENT_MASTER só tinha os GETs via
    // VIEW_ALL_SCHEDULES (linha acima), nunca poder de escrita.
    ['CREATE_TICKET_SCHEDULING', [Role.ADMIN, Role.AGENT_MASTER, Role.AGENT]],
    ['MANAGE_CONTRACTS', [Role.ADMIN]],
    ['MANAGE_CHECKLISTS', [Role.ADMIN, Role.AGENT_MASTER, Role.AGENT]],
    ['MANAGE_PERMISSION_GROUPS', [Role.ADMIN]],
    ['MANAGE_CLIENTS_AND_RESOURCE_GROUPS', [Role.ADMIN]],
    // service-desks.controller: a maioria dos endpoints era ADMIN-only,
    // mas import de feriados nacionais e PUT business-hours eram
    // ADMIN+AGENT_MASTER — union de todos os endpoints sob a mesma chave.
    ['MANAGE_SERVICE_DESKS', [Role.ADMIN, Role.AGENT_MASTER]],
  ] as const)('%s: todo Role que tinha @Roles(...) antes precisa da chave', (key, oldRoles) => {
    it.each(oldRoles)(`%s continua com '${key}'`, (role) => {
      expect(hasKey(role, key)).toBe(true);
    });
  });

  describe.each([
    // Grupo OR (@RequirePermission(a, b, ...)): basta UMA das chaves.
    [
      ['VIEW_ADMIN_REPORTS', 'VIEW_AGENT_REPORTS', 'VIEW_LAST_30_DAYS_TICKETS_WIDGET'],
      [Role.ADMIN, Role.AGENT_MASTER, Role.AGENT, Role.CLIENT_MASTER, Role.CLIENT],
    ],
    [
      ['VIEW_AGENT_REPORTS', 'VIEW_WORKLOG_INFO'],
      [Role.ADMIN, Role.AGENT_MASTER, Role.AGENT, Role.CLIENT_MASTER],
    ],
    [['VIEW_CLIENT_CONSUMPTION_STATEMENT_REPORT'], [Role.ADMIN, Role.CLIENT_MASTER]],
    [
      ['VIEW_CONTRACTS_ADMIN', 'VIEW_CONTRACTS_CLIENT'],
      [Role.ADMIN, Role.AGENT_MASTER, Role.AGENT, Role.CLIENT_MASTER],
    ],
  ] as const)('grupo OR %p: todo Role que tinha @Roles(...) antes precisa de ao menos uma chave', (keys, oldRoles) => {
    it.each(oldRoles)('%s tem ao menos uma das chaves do grupo', (role) => {
      expect(keys.some((key) => hasKey(role, key))).toBe(true);
    });
  });

  it('CLIENT nunca ganha permissões técnicas/administrativas que não tinha via @Roles', () => {
    expect(hasKey(Role.CLIENT, 'MANAGE_PASSWORD_VAULT')).toBe(false);
    expect(hasKey(Role.CLIENT, 'EDIT_TICKETS')).toBe(false);
    expect(hasKey(Role.CLIENT, 'VIEW_ALL_SCHEDULES')).toBe(false);
  });

  /**
   * DMTE-128: achados do QA (2ª rodada) — o spec acima só cobria "quem
   * deveria ter e não tem" (under-grant); estes casos capturam o inverso
   * ("quem tem e não deveria", over-grant), que foi exatamente o que
   * escapou da 1ª correção.
   */
  describe('over-grants reais verificados pelo QA (DMTE-128, não devem reaparecer)', () => {
    it('CLIENT_MASTER nunca ganha CREATE_TICKET_SCHEDULING (nunca teve poder de criar/editar/excluir compromissos, só VIEW_ALL_SCHEDULES)', () => {
      expect(hasKey(Role.CLIENT_MASTER, 'CREATE_TICKET_SCHEDULING')).toBe(false);
    });

    it('AGENT e AGENT_MASTER não ganham escrita no cofre de senhas via MANAGE_PASSWORD_VAULT (agora chave só de escrita, ADMIN-only)', () => {
      expect(hasKey(Role.AGENT, 'MANAGE_PASSWORD_VAULT')).toBe(false);
      expect(hasKey(Role.AGENT_MASTER, 'MANAGE_PASSWORD_VAULT')).toBe(false);
    });

    it('AGENT e AGENT_MASTER não ganham visibilidade da trilha de auditoria do cofre via VIEW_PASSWORD_VAULT_AUDIT', () => {
      expect(hasKey(Role.AGENT, 'VIEW_PASSWORD_VAULT_AUDIT')).toBe(false);
      expect(hasKey(Role.AGENT_MASTER, 'VIEW_PASSWORD_VAULT_AUDIT')).toBe(false);
    });
  });
});
