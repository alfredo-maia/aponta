import { Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { UsersService, SafeUser } from '../users/users.service';
import { PermissionsService } from '../permissions/permissions.service';
import { RegisterDto } from '../users/dto/register.dto';
import { ChangePasswordDto } from '../users/dto/change-password.dto';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface AuthenticatedRequest {
  user: SafeUser;
}

/**
 * Role assigned to every account created via the public, unauthenticated
 * registration endpoint. RegisterDto has no `role` field at all, so this is
 * the only role a self-registered user can ever get — never client-supplied.
 */
const DEFAULT_REGISTRATION_ROLE = Role.CLIENT;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(@Request() req: AuthenticatedRequest) {
    return this.authService.login(req.user);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.usersService.create({
      ...registerDto,
      role: DEFAULT_REGISTRATION_ROLE,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password updated successfully' };
  }

  // Backs useHasPermission on the frontend (DMTE-84, Tarefa 4): the JWT only
  // carries `role`, never the granular PermissionGroup keys, so the client
  // needs this round-trip to know which Configurações > Usuários submenu
  // items to render. ADMIN mirrors PermissionsGuard's bypass — isAdmin=true
  // regardless of PermissionGroup links, never computed from `permissions`.
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: AuthenticatedRequest) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      return null;
    }
    const safeUser = this.usersService.toSafeUser(user);
    const isAdmin = user.role === Role.ADMIN;
    const permissions = isAdmin
      ? []
      : Array.from(await this.permissionsService.getEffectivePermissions(user.id));
    return { ...safeUser, isAdmin, permissions };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }
}
