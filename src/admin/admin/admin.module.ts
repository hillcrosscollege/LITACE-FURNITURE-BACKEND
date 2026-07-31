import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminUser } from './entity/admin-entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../roles/entity/roles.entity';
import { AdminProfile } from '../admin-profiles/entity/admin-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUser, AdminProfile, Role])],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
