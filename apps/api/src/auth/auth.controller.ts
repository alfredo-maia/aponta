import { Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { UsersService, SafeUser } from '../users/users.service';
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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: AuthenticatedRequest) {
    const user = await this.usersService.findById(req.user.id);
    return user ? this.usersService.toSafeUser(user) : null;
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
