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
import {
  DEFAULT_PERMISSION_GROUPS,
  ROLE_GROUP_NAME,
} from '../src/permission-groups/default-permission-groups';

const SALT_ROUNDS = 10;

// DMTE-84/126/128 (grupos de permissão padrão por Role) e DMTE-133
// (retrabalho: `UsersService.create` passou a precisar do mesmo
// mapeamento, então ele mora em `src/permission-groups/
// default-permission-groups.ts` agora) — re-exportado aqui para que
// `seed.spec.ts` continue importando `DEFAULT_PERMISSION_GROUPS` de
// `./seed` sem mudanças.
export { DEFAULT_PERMISSION_GROUPS };

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
