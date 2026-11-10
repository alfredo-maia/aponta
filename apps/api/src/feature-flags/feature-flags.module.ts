import { Module } from '@nestjs/common';
import { FeatureFlagsController } from './feature-flags.controller';
import { FEATURE_ENV_TOKEN, FEATURE_FLAGS, FEATURE_FLAGS_TOKEN } from './feature-flags';

@Module({
  controllers: [FeatureFlagsController],
  providers: [
    { provide: FEATURE_FLAGS_TOKEN, useValue: FEATURE_FLAGS },
    { provide: FEATURE_ENV_TOKEN, useValue: process.env },
  ],
})
export class FeatureFlagsModule {}
