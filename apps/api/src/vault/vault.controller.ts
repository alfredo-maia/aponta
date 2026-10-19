import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { VaultService } from './vault.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { CredentialQueryDto } from './dto/credential-query.dto';
import { AuditQueryDto } from './dto/audit-query.dto';
import { RevealCredentialDto } from './dto/reveal-credential.dto';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { JwtOrTokenAuthGuard } from '../auth/guards/jwt-or-token-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

interface AuthenticatedRequest extends Request {
  user: CurrentUserPayload;
}

@ApiTags('Vault')
@ApiBearerAuth()
@Controller('vault')
@UseGuards(JwtOrTokenAuthGuard, RolesGuard)
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  // ---------------------------------------------------------------------
  // Folders
  // ---------------------------------------------------------------------

  @Get('folders')
  @Roles(Role.ADMIN, Role.AGENT_MASTER, Role.AGENT)
  @ApiOperation({ summary: 'List credential folders (vault folder tree) with credential counts' })
  findFolders(@CurrentUser() user: CurrentUserPayload) {
    return this.vaultService.findFolders(user);
  }

  @Post('folders')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new credential folder' })
  createFolder(@Body() dto: CreateFolderDto, @CurrentUser() user: CurrentUserPayload, @Req() req: AuthenticatedRequest) {
    return this.vaultService.createFolder(dto, user, req.ip);
  }

  @Patch('folders/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Rename a credential folder' })
  updateFolder(
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.vaultService.updateFolder(id, dto, user, req.ip);
  }

  @Delete('folders/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a credential folder (refused while it still has credentials)' })
  removeFolder(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Req() req: AuthenticatedRequest) {
    return this.vaultService.removeFolder(id, user, req.ip);
  }

  // ---------------------------------------------------------------------
  // Credentials
  // ---------------------------------------------------------------------

  @Get('credentials')
  @Roles(Role.ADMIN, Role.AGENT_MASTER, Role.AGENT)
  @ApiOperation({ summary: 'List credentials (paginated, searchable); never returns raw password/username' })
  findCredentials(@Query() query: CredentialQueryDto, @CurrentUser() user: CurrentUserPayload) {
    return this.vaultService.findCredentials(query, user);
  }

  @Post('credentials')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new credential' })
  createCredential(
    @Body() dto: CreateCredentialDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.vaultService.createCredential(dto, user, req.ip);
  }

  @Patch('credentials/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a credential' })
  updateCredential(
    @Param('id') id: string,
    @Body() dto: UpdateCredentialDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.vaultService.updateCredential(id, dto, user, req.ip);
  }

  @Delete('credentials/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a credential' })
  removeCredential(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Req() req: AuthenticatedRequest) {
    return this.vaultService.removeCredential(id, user, req.ip);
  }

  @Post('credentials/:id/reveal')
  @Roles(Role.ADMIN, Role.AGENT_MASTER, Role.AGENT)
  @ApiOperation({ summary: 'Reveal or copy a credential field (username/password); always audited' })
  reveal(
    @Param('id') id: string,
    @Body() dto: RevealCredentialDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.vaultService.reveal(id, dto, user, req.ip);
  }

  // ---------------------------------------------------------------------
  // Audit
  // ---------------------------------------------------------------------

  @Get('audit')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List vault audit trail entries (ADMIN only)' })
  findAudit(@Query() query: AuditQueryDto, @CurrentUser() user: CurrentUserPayload) {
    return this.vaultService.findAudit(query, user);
  }
}
