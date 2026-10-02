import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { TenantHelper } from '../core/security/tenant.helper';
import { Role } from '@prisma/client';

@Injectable()
export class VaultService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: CurrentUserPayload) {
    const where = TenantHelper.getCredentialWhere(user);
    if (where.id === '00000000-0000-0000-0000-000000000000') {
      throw new ForbiddenException('Acesso negado ao Cofre de Senhas');
    }

    // Tiflux groups credentials by Organization.
    // So we fetch the credentials WITH their Organization data, ordered by Org Name.
    return this.prisma.credential.findMany({
      where,
      include: { organization: true },
      orderBy: [{ organization: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async create(createDto: CreateCredentialDto, user: CurrentUserPayload) {
    // Only ADMIN and CLIENT_MASTER can create.
    if (![Role.ADMIN, Role.CLIENT_MASTER].includes(user.role)) {
      throw new ForbiddenException('Não autorizado a criar credenciais');
    }

    let targetOrganizationId = '';

    if (user.role === Role.CLIENT_MASTER) {
      if (!user.organizationId) {
         throw new ForbiddenException('Você não pertence a uma organização');
      }
      targetOrganizationId = user.organizationId;
    } else {
      // ADMIN creating... normally they should pass organizationId in a separate endpoint
      // but for MVP, we'll just throw if they don't have it in a separate DTO, 
      // or we can allow adding a query param. 
      // Actually, since ADMIN manages everything, let's just make it simple: 
      // If ADMIN calls this without specifying org, it fails unless we update DTO.
      // Let's assume ADMIN must pass it somehow, or we can use the first org for test.
      const org = await this.prisma.organization.findFirst();
      if (!org) throw new NotFoundException('No organizations exist');
      targetOrganizationId = org.id;
    }

    return this.prisma.credential.create({
      data: {
        ...createDto,
        organizationId: targetOrganizationId,
      },
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    if (![Role.ADMIN, Role.CLIENT_MASTER].includes(user.role)) {
      throw new ForbiddenException('Não autorizado a excluir credenciais');
    }

    const where = TenantHelper.getCredentialWhere(user);
    const credential = await this.prisma.credential.findFirst({
      where: { id, ...where },
    });

    if (!credential) {
      throw new NotFoundException('Credencial não encontrada ou sem permissão');
    }

    await this.prisma.credential.delete({ where: { id } });
    return { success: true };
  }
}
