import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Commit de que a imagem foi construída (ARG APONTA_COMMIT no Dockerfile).
 * O smoke test do deploy compara este valor com o commit que deveria estar no ar;
 * sem guard pelo mesmo motivo do health, e não expõe dado de negócio.
 */
@SkipThrottle()
@Controller('version')
export class VersionController {
  @Get()
  version(): { commit: string } {
    return { commit: process.env['APONTA_COMMIT'] || 'unknown' };
  }
}
