import type { PrismaClient, Role } from '@prisma/client';

/**
 * DMTE-133: these E2E specs create throwaway fixture users directly via
 * `prisma.user.createMany` + hand-signed JWTs, bypassing `/auth/register`
 * and `UsersService.create` entirely (so they can control the exact id
 * embedded in the token). That means they also bypass the PermissionGroup
 * link `UsersService.create` now adds to every real new user — without it,
 * every `@RequirePermission`-gated endpoint 403s for a non-ADMIN fixture
 * user (ADMIN bypasses PermissionsGuard, so it never needs this).
 *
 * Must match `ROLE_GROUP_NAME` in
 * `apps/api/src/permission-groups/default-permission-groups.ts` exactly —
 * duplicated here (not imported) because `@nx/enforce-module-boundaries`
 * rejects a relative cross-project import from `web-e2e` into `api/src`,
 * and this is 5 display-name strings, not the ~86-key permission catalog,
 * so the duplication risk is low and a shared library felt like overkill
 * for this one lookup.
 */
const ROLE_GROUP_NAME: Record<Role, string> = {
  ADMIN: 'Administrador',
  AGENT_MASTER: 'Gerente de Atendimento',
  AGENT: 'Atendente',
  CLIENT_MASTER: 'Cliente Master',
  CLIENT: 'Cliente',
};

/**
 * Links a fixture user to the default PermissionGroup for their role. The
 * group itself is never created here: `apps/api/prisma/seed.ts` always
 * creates all 5 role groups before any E2E spec runs (CI's "Seed database"
 * step, and this skill's local E2E procedure run the same way) — if the
 * lookup fails, that's a broken test setup (seed didn't run), not
 * something to paper over by inventing a permission-less group here.
 */
export async function linkFixtureUserToDefaultPermissionGroup(
  prisma: PrismaClient,
  userId: string,
  role: Role,
): Promise<void> {
  const name = ROLE_GROUP_NAME[role];
  const group = await prisma.permissionGroup.findFirst({ where: { name } });
  if (!group) {
    throw new Error(
      `Default PermissionGroup "${name}" not found — did prisma/seed.ts run before this spec?`,
    );
  }

  await prisma.permissionGroupUser.create({
    data: { permissionGroupId: group.id, userId },
  });
}
