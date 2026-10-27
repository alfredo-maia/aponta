import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import type { User } from '@prisma/client';
import { TenantHelper } from '../core/security/tenant.helper';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

const SALT_ROUNDS = 10;
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

export type SafeUser = Omit<User, 'password'>;

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

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          ...(dto.role ? { role: dto.role } : {}),
        },
      });

      return this.toSafeUser(user);
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
  }

  toSafeUser(user: User): SafeUser {
    const rest: SafeUser = { ...user };
    delete (rest as Partial<User>).password;
    return rest;
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

  async findAll(): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: { organization: true },
    });
    return users.map((user) => this.toSafeUser(user));
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
