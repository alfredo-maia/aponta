import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTokensService } from './api-tokens.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { CreateApiTokenDto } from './dto/create-api-token.dto';

/**
 * Token management is ONLY reachable via an authenticated browser
 * session (JwtAuthGuard, not the JwtOrTokenAuthGuard used by business
 * endpoints) — an MCP/API token cannot be used to mint more tokens.
 */
@UseGuards(JwtAuthGuard)
@Controller('api-tokens')
export class ApiTokensController {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  @Post()
  create(
    @Body() dto: CreateApiTokenDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.apiTokensService.create(user, dto.name);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.apiTokensService.findAll(user);
  }

  @Delete(':id')
  revoke(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.apiTokensService.revoke(id, user);
  }
}
