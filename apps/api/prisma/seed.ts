/**
 * Idempotent dev/E2E seed script.
 *
 * Run via `pnpm exec nx run api:prisma-seed` (aliased as `pnpm db:seed`).
 * Safe to re-run any number of times (e.g. before every local E2E run):
 * the User row is upserted by its unique `email`, and the ServiceDesk row
 * is looked up by `name` first (ServiceDesk has no unique constraint on
 * `name` in the schema) and only created if missing, rather than blindly
 * inserted — so repeat runs never hit a unique-constraint violation or
 * produce duplicate rows.
 *
 * Seeded data (documented here as the single source of truth for what
 * apps/web-e2e specs log in with / select):
 *   - User:         agent@aponta.com / Password123! (role AGENT)
 *   - User:         admin@aponta.com / Password123! (role ADMIN)
 *   - ServiceDesk:  "General Support" (primary; used by tickets.spec.ts)
 *   - ServiceDesk:  "IT Infrastructure" (secondary; lets dashboard.spec.ts
 *     prove the service-desk filter actually narrows results, not just
 *     that a dropdown exists)
 *
 * The password is hashed with bcryptjs at the same SALT_ROUNDS (10) used by
 * apps/api/src/users/users.service.ts, so it authenticates identically to a
 * real registration through AuthService.validateUser's bcrypt.compare.
 */
import { PrismaClient, Role, AttendanceType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PERMISSION_KEYS } from '../src/permission-groups/permission-catalog';

const SALT_ROUNDS = 10;

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

const ROLE_GROUP_NAME: Record<Role, string> = {
  [Role.ADMIN]: 'Administrador',
  [Role.AGENT_MASTER]: 'Gerente de Atendimento',
  [Role.AGENT]: 'Atendente',
  [Role.CLIENT_MASTER]: 'Cliente Master',
  [Role.CLIENT]: 'Cliente',
};

const SEED_AGENT = {
  name: 'Seed Agent',
  email: 'agent@aponta.com',
  password: 'Password123!',
  role: Role.AGENT,
};

const SEED_ADMIN = {
  name: 'Seed Admin',
  email: 'admin@aponta.com',
  password: 'Password123!',
  role: Role.ADMIN,
};

const SEED_SERVICE_DESK_NAME = 'General Support';
const SEED_SERVICE_DESK_SECONDARY_NAME = 'IT Infrastructure';

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL'],
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const hashedPassword = await bcrypt.hash(SEED_AGENT.password, SALT_ROUNDS);
    const hashedAdminPassword = await bcrypt.hash(SEED_ADMIN.password, SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: SEED_AGENT.email },
      update: {},
      create: {
        name: SEED_AGENT.name,
        email: SEED_AGENT.email,
        password: hashedPassword,
        role: SEED_AGENT.role,
      },
    });
    console.log(`Seeded user: ${user.email} (role ${user.role})`);

    const admin = await prisma.user.upsert({
      where: { email: SEED_ADMIN.email },
      update: {},
      create: {
        name: SEED_ADMIN.name,
        email: SEED_ADMIN.email,
        password: hashedAdminPassword,
        role: SEED_ADMIN.role,
      },
    });
    console.log(`Seeded user: ${admin.email} (role ${admin.role})`);

    let serviceDesk = await prisma.serviceDesk.findFirst({
      where: { name: SEED_SERVICE_DESK_NAME },
    });
    if (!serviceDesk) {
      serviceDesk = await prisma.serviceDesk.create({
        data: { name: SEED_SERVICE_DESK_NAME },
      });
      console.log(`Created service desk: ${serviceDesk.name}`);
    } else {
      console.log(`Service desk already exists: ${serviceDesk.name}`);
    }

    let secondaryServiceDesk = await prisma.serviceDesk.findFirst({
      where: { name: SEED_SERVICE_DESK_SECONDARY_NAME },
    });
    if (!secondaryServiceDesk) {
      secondaryServiceDesk = await prisma.serviceDesk.create({
        data: { name: SEED_SERVICE_DESK_SECONDARY_NAME },
      });
      console.log(`Created service desk: ${secondaryServiceDesk.name}`);
    } else {
      console.log(
        `Service desk already exists: ${secondaryServiceDesk.name}`,
      );
    }

    // Issue #22 (RBAC/Organizations) scoped AGENT/AGENT_MASTER visibility in
    // TicketsService.findAll/findOne to ServiceDesks the agent is assigned
    // to (`serviceDesk.agents`). Without this, the seeded agent is assigned
    // to NO desk and TicketsService.findAll returns an empty list for them,
    // which silently broke every E2E spec that logs in as agent@aponta.com
    // and expects to see tickets it just created (dashboard.spec.ts,
    // tickets.spec.ts) — connect the seeded agent to both seeded desks so
    // it can see/manage tickets on either, matching pre-RBAC behavior.
    await prisma.serviceDesk.update({
      where: { id: serviceDesk.id },
      data: { agents: { connect: { id: user.id } } },
    });
    await prisma.serviceDesk.update({
      where: { id: secondaryServiceDesk.id },
      data: { agents: { connect: { id: user.id } } },
    });
    console.log(
      `Assigned ${user.email} as agent of: ${serviceDesk.name}, ${secondaryServiceDesk.name}`,
    );

    // DMTE-84 (Tarefa 1): seed one default PermissionGroup per Role and link
    // each seeded user to the group matching their own role, so the new
    // Configurações > Usuários > Grupos de permissões screen has real data
    // from the very first run instead of an empty list.
    const roleToGroup = new Map<Role, { id: string }>();
    for (const role of Object.values(Role)) {
      const name = ROLE_GROUP_NAME[role];
      let group = await prisma.permissionGroup.findFirst({ where: { name } });
      if (!group) {
        group = await prisma.permissionGroup.create({
          data: {
            name,
            description: DEFAULT_PERMISSION_GROUPS[role].description,
            permissions: DEFAULT_PERMISSION_GROUPS[role].permissions,
          },
        });
        console.log(`Created permission group: ${group.name}`);
      } else {
        console.log(`Permission group already exists: ${group.name}`);
      }
      roleToGroup.set(role, group);
    }

    for (const seededUser of [user, admin]) {
      const group = roleToGroup.get(seededUser.role);
      if (!group) continue;
      await prisma.permissionGroupUser.upsert({
        where: {
          permissionGroupId_userId: { permissionGroupId: group.id, userId: seededUser.id },
        },
        update: {},
        create: { permissionGroupId: group.id, userId: seededUser.id },
      });
    }
    console.log('Linked seeded users to their default permission group');

    // Seed sample ticket and worklogs if needed (paridade com critério DMTE-12)
    let sampleTicket = await prisma.ticket.findFirst({
      where: { serviceDeskId: serviceDesk.id },
    });
    if (!sampleTicket) {
      sampleTicket = await prisma.ticket.create({
        data: {
          protocol: 'AP-2026-0001',
          title: 'Chamado de Exemplo para Apontamento de Horas',
          description: 'Ticket inicial de teste criado pelo seed.',
          serviceDeskId: serviceDesk.id,
          requesterId: user.id,
          agentId: user.id,
        },
      });
      console.log(`Created sample ticket: ${sampleTicket.protocol}`);
    }

    const existingWorklog = await prisma.worklog.findFirst({
      where: { ticketId: sampleTicket.id },
    });
    if (!existingWorklog) {
      await prisma.worklog.createMany({
        data: [
          {
            ticketId: sampleTicket.id,
            authorId: user.id,
            description: 'Análise inicial do chamado e diagnóstico',
            startTime: new Date('2026-10-01T08:00:00Z'),
            endTime: new Date('2026-10-01T08:45:00Z'),
            minutes: 45,
            attendanceType: AttendanceType.REMOTE,
            billable: true,
          },
          {
            ticketId: sampleTicket.id,
            authorId: user.id,
            description: 'Configuração de ambiente e execução de testes',
            startTime: new Date('2026-10-01T13:00:00Z'),
            endTime: new Date('2026-10-01T14:30:00Z'),
            minutes: 90,
            attendanceType: AttendanceType.ON_SITE,
            billable: true,
          },
        ],
      });
      console.log(`Seeded sample worklogs for ticket: ${sampleTicket.protocol}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Guarded so `seed.spec.ts` can import DEFAULT_PERMISSION_GROUPS without
// triggering a real Postgres connection attempt; `ts-node prisma/seed.ts`
// (the only real invocation path, via the `prisma-seed` Nx target) sets
// require.main to this file, so production execution is unaffected.
if (require.main === module) {
  main().catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
}
