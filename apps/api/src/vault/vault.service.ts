import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CredentialAction, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { CredentialQueryDto } from './dto/credential-query.dto';
import { AuditQueryDto } from './dto/audit-query.dto';
import { RevealCredentialDto } from './dto/reveal-credential.dto';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { TenantHelper } from '../core/security/tenant.helper';

const DENIED_SENTINEL = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class VaultService {
  constructor(private readonly prisma: PrismaService) {}

  /** Throws ForbiddenException for roles fail-closed by TenantHelper.getCredentialWhere (CLIENT/CLIENT_MASTER). */
  private assertVaultAccess(user: CurrentUserPayload) {
    const where = TenantHelper.getCredentialWhere(user);
    if ((where as { id?: string }).id === DENIED_SENTINEL) {
      throw new ForbiddenException('Acesso negado ao Cofre de Senhas');
    }
    return where;
  }

  private assertAdmin(user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas Administradores podem gerenciar o cofre');
    }
  }

  /**
   * Strips `username`/`password` from any Credential-shaped Prisma result
   * before it leaves the service, replacing them with `hasUsername`/
   * `hasPassword` booleans. Prisma's default `create`/`update`/`findUnique`
   * return every column with no select/omit — this is the single place
   * that guarantees the raw secret never reaches a controller response
   * (acceptance criterion #1), used by every method that hands a
   * Credential back to the caller (listing, create, update).
   */
  private toSafeCredential<T extends { username?: string | null; password?: string | null }>(
    credential: T,
  ): Omit<T, 'username' | 'password'> & { hasUsername: boolean; hasPassword: boolean } {
    const { username, password, ...rest } = credential;
    return { ...rest, hasUsername: Boolean(username), hasPassword: Boolean(password) } as Omit<
      T,
      'username' | 'password'
    > & { hasUsername: boolean; hasPassword: boolean };
  }

  private async resolveActorName(userId: string): Promise<string> {
    const actor = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    return actor?.name ?? userId;
  }

  private async logAudit(params: {
    organizationId: string;
    action: CredentialAction;
    folderId?: string | null;
    credentialId?: string | null;
    targetName: string;
    user: CurrentUserPayload;
    ipAddress?: string | null;
  }) {
    const actorName = await this.resolveActorName(params.user.id);
    await this.prisma.credentialAuditLog.create({
      data: {
        organizationId: params.organizationId,
        action: params.action,
        folderId: params.folderId ?? null,
        credentialId: params.credentialId ?? null,
        targetName: params.targetName,
        actorId: params.user.id,
        actorName,
        ipAddress: params.ipAddress ?? null,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Folders
  // ---------------------------------------------------------------------

  async findFolders(user: CurrentUserPayload) {
    this.assertVaultAccess(user);

    const folders = await this.prisma.credentialFolder.findMany({
      include: { _count: { select: { credentials: true } } },
      orderBy: { name: 'asc' },
    });

    return folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      organizationId: folder.organizationId,
      credentialCount: folder._count.credentials,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    }));
  }

  async createFolder(dto: CreateFolderDto, user: CurrentUserPayload, ipAddress?: string) {
    this.assertAdmin(user);

    const org = await this.prisma.organization.findFirst();
    if (!org) throw new NotFoundException('No organizations exist');

    const folder = await this.prisma.credentialFolder.create({
      data: { name: dto.name, organizationId: org.id },
    });

    await this.logAudit({
      organizationId: folder.organizationId,
      action: CredentialAction.CREATE_FOLDER,
      folderId: folder.id,
      targetName: folder.name,
      user,
      ipAddress,
    });

    return folder;
  }

  // Renaming a folder has no corresponding CredentialAction in the spec's
  // enum (only CREATE_FOLDER/DELETE_FOLDER are audited) — ipAddress is kept
  // in the signature for call-site symmetry with the other mutating methods.
  async updateFolder(id: string, dto: UpdateFolderDto, user: CurrentUserPayload, _ipAddress?: string) {
    this.assertAdmin(user);

    const folder = await this.prisma.credentialFolder.findUnique({ where: { id } });
    if (!folder) throw new NotFoundException('Pasta não encontrada');

    return this.prisma.credentialFolder.update({
      where: { id },
      data: { name: dto.name ?? folder.name },
    });
  }

  async removeFolder(id: string, user: CurrentUserPayload, ipAddress?: string) {
    this.assertAdmin(user);

    const folder = await this.prisma.credentialFolder.findUnique({
      where: { id },
      include: { _count: { select: { credentials: true } } },
    });
    if (!folder) throw new NotFoundException('Pasta não encontrada');

    if (folder._count.credentials > 0) {
      throw new ConflictException('Não é possível remover uma pasta que contém credenciais');
    }

    await this.prisma.credentialFolder.delete({ where: { id } });

    await this.logAudit({
      organizationId: folder.organizationId,
      action: CredentialAction.DELETE_FOLDER,
      folderId: folder.id,
      targetName: folder.name,
      user,
      ipAddress,
    });

    return { success: true };
  }

  // ---------------------------------------------------------------------
  // Credentials
  // ---------------------------------------------------------------------

  async findCredentials(query: CredentialQueryDto, user: CurrentUserPayload) {
    this.assertVaultAccess(user);

    const page = Math.max(parseInt(query.page ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit ?? '20', 10) || 20, 1), 100);

    const where: Record<string, unknown> = {};
    if (query.folderId === 'root') {
      where.folderId = null;
    } else if (query.folderId) {
      where.folderId = query.folderId;
    }
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [total, credentials] = await Promise.all([
      this.prisma.credential.count({ where }),
      this.prisma.credential.findMany({
        where,
        select: {
          id: true,
          name: true,
          url: true,
          description: true,
          organizationId: true,
          folderId: true,
          username: true,
          password: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Acceptance criterion #1: the listing payload NEVER carries the raw
    // username/password — only booleans signalling whether a value exists.
    // The real values only ever leave the backend through POST /reveal.
    const data = credentials.map((credential) => this.toSafeCredential(credential));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) },
    };
  }

  async createCredential(dto: CreateCredentialDto, user: CurrentUserPayload, ipAddress?: string) {
    this.assertAdmin(user);

    const org = await this.prisma.organization.findFirst();
    if (!org) throw new NotFoundException('No organizations exist');

    if (dto.folderId) {
      const folder = await this.prisma.credentialFolder.findUnique({ where: { id: dto.folderId } });
      if (!folder) throw new NotFoundException('Pasta não encontrada');
    }

    const credential = await this.prisma.credential.create({
      data: {
        ...dto,
        organizationId: org.id,
      },
    });

    await this.logAudit({
      organizationId: credential.organizationId,
      action: CredentialAction.CREATE_CREDENTIAL,
      folderId: credential.folderId,
      credentialId: credential.id,
      targetName: credential.name,
      user,
      ipAddress,
    });

    return this.toSafeCredential(credential);
  }

  async updateCredential(id: string, dto: UpdateCredentialDto, user: CurrentUserPayload, ipAddress?: string) {
    this.assertAdmin(user);

    const credential = await this.prisma.credential.findUnique({ where: { id } });
    if (!credential) throw new NotFoundException('Credencial não encontrada');

    if (dto.folderId) {
      const folder = await this.prisma.credentialFolder.findUnique({ where: { id: dto.folderId } });
      if (!folder) throw new NotFoundException('Pasta não encontrada');
    }

    const updated = await this.prisma.credential.update({
      where: { id },
      data: dto,
    });

    await this.logAudit({
      organizationId: updated.organizationId,
      action: CredentialAction.UPDATE_CREDENTIAL,
      folderId: updated.folderId,
      credentialId: updated.id,
      targetName: updated.name,
      user,
      ipAddress,
    });

    return this.toSafeCredential(updated);
  }

  async removeCredential(id: string, user: CurrentUserPayload, ipAddress?: string) {
    this.assertAdmin(user);

    const credential = await this.prisma.credential.findFirst({ where: { id } });
    if (!credential) throw new NotFoundException('Credencial não encontrada');

    await this.prisma.credential.delete({ where: { id } });

    await this.logAudit({
      organizationId: credential.organizationId,
      action: CredentialAction.DELETE_CREDENTIAL,
      folderId: credential.folderId,
      credentialId: credential.id,
      targetName: credential.name,
      user,
      ipAddress,
    });

    return { success: true };
  }

  // ---------------------------------------------------------------------
  // Reveal / copy (acceptance criterion #2: every reveal/copy is audited)
  // ---------------------------------------------------------------------

  async reveal(id: string, dto: RevealCredentialDto, user: CurrentUserPayload, ipAddress?: string) {
    this.assertVaultAccess(user);

    const credential = await this.prisma.credential.findFirst({ where: { id } });
    if (!credential) throw new NotFoundException('Credencial não encontrada');

    if (!['username', 'password'].includes(dto.field)) {
      throw new BadRequestException('Campo inválido');
    }

    const value = dto.field === 'username' ? credential.username ?? null : credential.password ?? null;

    const action: CredentialAction =
      dto.intent === 'reveal'
        ? CredentialAction.REVEAL_CREDENTIAL
        : dto.field === 'username'
          ? CredentialAction.COPY_USERNAME
          : CredentialAction.COPY_PASSWORD;

    await this.logAudit({
      organizationId: credential.organizationId,
      action,
      folderId: credential.folderId,
      credentialId: credential.id,
      targetName: credential.name,
      user,
      ipAddress,
    });

    return { value };
  }

  // ---------------------------------------------------------------------
  // Audit (acceptance criterion #4, ADMIN only)
  // ---------------------------------------------------------------------

  async findAudit(query: AuditQueryDto, user: CurrentUserPayload) {
    this.assertAdmin(user);

    const page = Math.max(parseInt(query.page ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit ?? '20', 10) || 20, 1), 100);

    const where: Record<string, unknown> = {};
    if (query.actorId) where.actorId = query.actorId;
    if (query.action) where.action = query.action;
    if (query.query) where.targetName = { contains: query.query, mode: 'insensitive' };
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [total, logs] = await Promise.all([
      this.prisma.credentialAuditLog.count({ where }),
      this.prisma.credentialAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) },
    };
  }
}
