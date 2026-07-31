import { Module } from '@nestjs/common';
import { AdminProfilesController } from './admin-profiles.controller';

@Module({
  controllers: [AdminProfilesController],
  providers: [],
  exports: [],
})
export class AdminProfilesModule {}
