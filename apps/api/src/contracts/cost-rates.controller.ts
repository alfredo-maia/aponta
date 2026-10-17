import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsDateString, IsInt, IsUUID, Max, Min } from 'class-validator';
import { Role } from '@prisma/client';
import { CostRatesService } from './cost-rates.service';
import { JwtOrTokenAuthGuard } from '../auth/guards/jwt-or-token-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

export class CreateCostRateDto {
  @IsUUID() userId!: string;
  @IsDateString() effectiveFrom!: string;
  @IsInt() @Min(0) @Max(2147483647) hourlyCostCents!: number;
}

@Controller('contracts/cost-rates')
@UseGuards(JwtOrTokenAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class CostRatesController {
  constructor(private readonly service: CostRatesService) {}
  @Get() list(@CurrentUser() user: CurrentUserPayload) { return this.service.list(user); }
  @Post() create(@Body() dto: CreateCostRateDto, @CurrentUser() user: CurrentUserPayload) { return this.service.create(dto, user); }
}
