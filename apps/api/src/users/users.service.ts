import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import type { User } from '@prisma/client';
import {
  DEFAULT_PERMISSION_GROUPS,
  ROLE_GROUP_NAME,
} from '../permission-groups/default-permission-groups';
import { TenantHelper } from '../core/security/tenant.helper';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

const SALT_ROUNDS = 10;
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const RECORD_NOT_FOUND = 'P2025';
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export type SafeUser = Omit<User, 'password'>;

interface GroupSummary {
  id: string;
  name: string;
}

export type UserWithGroups = SafeUser & {
  technicalGroup: GroupSummary | null;
  permissionGroups: GroupSummary[];
};

type UserWithGroupRelations = User & {
  technicalGroup?: GroupSummary | null;
  permissionGroupLinks?: { permissionGroup: GroupSummary }[];
};

export interface PaginatedUsers {
  data: UserWithGroups[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

// Tiflux-parity (DMTE-84, Tarefa 3): a tela de Usuários mostra as colunas
// "Grupos de permissões" e "Grupos de atendentes" — este include resolve
// ambas num único round-trip ao Postgres.
const USER_GROUPS_INCLUDE = {
  organization: true,
  technicalGroup: { select: { id: true, name: true } },
  permissionGroupLinks: {
    include: { permissionGroup: { select: { id: true, name: true } } },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          ...(dto.role ? { role: dto.role } : {}),
        },
      });
    } catch (error) {
      // Two concurrent registrations can both pass the findByEmail check
      // above (TOCTOU race). Translate the resulting unique-constraint
      // violation from the database into the same clean 409 the pre-check
      // produces, instead of letting a raw Prisma error surface as a 500.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }

    await this.linkToDefaultPermissionGroup(user);

    return this.toSafeUser(user);
  }

  // DMTE-133: sem isto, PermissionsService.getEffectivePermissions não
  // encontra nenhum PermissionGroup vinculado a um usuário recém-criado e
  // ele nasce sem nenhuma permissão (ADMIN tem bypass no PermissionsGuard,
  // os demais papéis não) — reusa o mesmo mapeamento Role -> grupo padrão
  // que o seed usa para os 2 usuários fixos (find-or-create pelo `name`,
  // já que PermissionGroup não tem unique constraint nesse campo).
  private async linkToDefaultPermissionGroup(user: User): Promise<void> {
    const name = ROLE_GROUP_NAME[user.role];
    let group = await this.prisma.permissionGroup.findFirst({ where: { name } });
    if (!group) {
      group = await this.prisma.permissionGroup.create({
        data: {
          name,
          description: DEFAULT_PERMISSION_GROUPS[user.role].description,
          permissions: DEFAULT_PERMISSION_GROUPS[user.role].permissions,
        },
      });
    }

    await this.prisma.permissionGroupUser.create({
      data: { permissionGroupId: group.id, userId: user.id },
    });
  }

  toSafeUser(user: User): SafeUser {
    const rest: SafeUser = { ...user };
    delete (rest as Partial<User>).password;
    return rest;
  }

  private toUserWithGroups(user: UserWithGroupRelations): UserWithGroups {
    const safe = this.toSafeUser(user) as SafeUser & {
      permissionGroupLinks?: unknown;
    };
    delete safe.permissionGroupLinks;

    return {
      ...safe,
      technicalGroup: user.technicalGroup ?? null,
      permissionGroups: (user.permissionGroupLinks ?? []).map(
        (link) => link.permissionGroup,
      ),
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      // Same error as a wrong password: never reveal whether the user
      // exists to a caller who only has a (possibly stale) JWT.
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });
  }

  async updateProfile(
    userId: string,
    data: { name: string; email: string },
  ): Promise<SafeUser> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { name: data.name, email: data.email },
      });
      return this.toSafeUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  // Tiflux-parity (DMTE-84, Tarefa 3): mantém retrocompatibilidade com os
  // chamadores existentes (TicketForm.tsx, OrganizationsPage.tsx) que fazem
  // GET /users sem nenhum query param e esperam um array simples — só muda
  // para o envelope paginado `{ data, meta }` (mesmo formato já usado pelo
  // Vault) quando o chamador passa página/busca/filtro explicitamente.
  async findAll(query: UserQueryDto): Promise<UserWithGroups[] | PaginatedUsers> {
    const hasPaginationParams = Boolean(
      query.page ||
        query.pageSize ||
        query.q ||
        query.technicalGroupId ||
        query.permissionGroupId,
    );

    const where: Prisma.UserWhereInput = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.technicalGroupId) {
      where.technicalGroupId = query.technicalGroupId;
    }
    if (query.permissionGroupId) {
      where.permissionGroupLinks = {
        some: { permissionGroupId: query.permissionGroupId },
      };
    }

    if (!hasPaginationParams) {
      const users = await this.prisma.user.findMany({
        where,
        orderBy: { name: 'asc' },
        include: USER_GROUPS_INCLUDE,
      });
      return users.map((user) => this.toUserWithGroups(user));
    }

    const page = Math.max(parseInt(query.page ?? '1', 10) || 1, 1);
    const pageSize = Math.min(
      Math.max(
        parseInt(query.pageSize ?? String(DEFAULT_PAGE_SIZE), 10) ||
          DEFAULT_PAGE_SIZE,
        1,
      ),
      MAX_PAGE_SIZE,
    );

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { name: 'asc' },
        include: USER_GROUPS_INCLUDE,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: users.map((user) => this.toUserWithGroups(user)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
    };
  }

  async findOne(id: string): Promise<UserWithGroups> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: USER_GROUPS_INCLUDE,
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.toUserWithGroups(user);
  }

  async setActive(id: string, active: boolean): Promise<SafeUser> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { active },
        include: { organization: true },
      });
      return this.toSafeUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === RECORD_NOT_FOUND
      ) {
        throw new NotFoundException('Usuário não encontrado');
      }
      throw error;
    }
  }

  async updateAdminFields(id: string, data: { role?: Role; organizationId?: string | null }) {
    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: { organization: true },
    });
    return this.toSafeUser(user);
  }

  /**
   * "Atendente" picker for the ticket Busca avançada / assignment UI
   * (SPEC DMTE-137 D8/T4). ADMIN sees every agent with no desk scoping;
   * AGENT/AGENT_MASTER only see agents of the service desks they can
   * themselves access, reusing the exact same scope
   * `TenantHelper.getServiceDeskWhere` applies to ticket/desk visibility.
   */
  async findAgents(currentUser: CurrentUserPayload): Promise<SafeUser[]> {
    const roleFilter: Prisma.UserWhereInput = {
      role: { in: [Role.AGENT, Role.AGENT_MASTER, Role.ADMIN] },
    };

    if (currentUser.role === Role.ADMIN) {
      const users = await this.prisma.user.findMany({
        where: roleFilter,
        orderBy: { name: 'asc' },
      });
      return users.map((user) => this.toSafeUser(user));
    }

    const desks = await this.prisma.serviceDesk.findMany({
      where: TenantHelper.getServiceDeskWhere(currentUser),
      select: {
        agents: { select: { id: true } },
        agentGroups: { select: { members: { select: { id: true } } } },
      },
    });
    const agentIds = new Set<string>();
    for (const desk of desks) {
      desk.agents.forEach((agent) => agentIds.add(agent.id));
      desk.agentGroups.forEach((group) =>
        group.members.forEach((member) => agentIds.add(member.id)),
      );
    }

    const users = await this.prisma.user.findMany({
      where: { ...roleFilter, id: { in: Array.from(agentIds) } },
      orderBy: { name: 'asc' },
    });
    return users.map((user) => this.toSafeUser(user));
  }
}
