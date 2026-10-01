import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { PublicCsatService } from './public-csat.service';
import { RateCsatDto } from './dto/rate-csat.dto';

/**
 * Deliberately NOT behind JwtAuthGuard/OptionalJwtAuthGuard — this is the
 * public, no-login flow reached from the CSAT invitation e-mail. The
 * opaque `csatToken` path param IS the authorization (see
 * PublicCsatService's doc comment). Mounted under a distinct `public/csat`
 * prefix (not `tickets/:id/csat`) so it never collides with, nor needs to
 * share guards with, the authenticated CsatController.
 */
@Controller('public/csat')
export class PublicCsatController {
  constructor(private readonly publicCsatService: PublicCsatService) {}

  @Get(':token')
  getSummary(@Param('token') token: string) {
    return this.publicCsatService.getSummary(token);
  }

  @Patch(':token')
  rate(@Param('token') token: string, @Body() dto: RateCsatDto) {
    return this.publicCsatService.rate(token, dto);
  }
}
