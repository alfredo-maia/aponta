import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Deliberately NOT guarded by JwtOrTokenAuthGuard/RolesGuard — health check
 * endpoints must be reachable by infra (load balancers, uptime monitors,
 * container orchestrators) without credentials. It exposes only a boolean
 * "up"/"down" status, never business data.
 *
 * @SkipThrottle: monitors typically poll every few seconds, which would
 * otherwise trip the global 100 req/min rate limit and make health checks
 * flicker to 429 under normal monitoring load.
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }
}
