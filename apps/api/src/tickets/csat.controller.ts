import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { CsatService } from './csat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from './decorators/current-user.decorator';
import { RateCsatDto } from './dto/rate-csat.dto';

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class CsatController {
  constructor(private readonly csatService: CsatService) {}

  @Patch(':id/csat')
  rate(
    @Param('id') id: string,
    @Body() dto: RateCsatDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.csatService.rate(id, dto, user);
  }
}