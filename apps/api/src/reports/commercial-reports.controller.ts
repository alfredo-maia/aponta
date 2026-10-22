import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsUUID, Matches } from 'class-validator';
import { CommercialReportsService } from './commercial-reports.service';
import { JwtOrTokenAuthGuard } from '../auth/guards/jwt-or-token-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

export class CommercialFilterDto {
  @IsOptional() @IsUUID() contractId?: string;
  @IsOptional() @Matches(/^(20\d{2}|21\d{2})-(0[1-9]|1[0-2])$/) month?: string;
}

@Controller('reports/commercial')
@UseGuards(JwtOrTokenAuthGuard, PermissionsGuard)
@RequirePermission('VIEW_CLIENT_CONSUMPTION_STATEMENT_REPORT')
export class CommercialReportsController {
  constructor(private readonly service: CommercialReportsService) {}
  @Get() get(@CurrentUser() user: CurrentUserPayload, @Query() filters: CommercialFilterDto) {
    return this.service.getCommercial(user, filters);
  }
}
