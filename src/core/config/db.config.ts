import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { AdminProfile } from 'src/admin/admin-profiles/entity/admin-profile.entity';
import { AdminUser } from 'src/admin/admin/entity/admin-entity';
import { Permission } from 'src/admin/permissions/entity/permission.entity';
import { Role } from 'src/admin/roles/entity/roles.entity';
import { User } from 'src/user/entity/user.entity';
// import { User } from '../user/entities/user.entity';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get<string>('DB_HOST'),
    port: +configService.get<string>('DB_PORT')!,
    username: configService.get<string>('POSTGRES_USER'),
    password: configService.get<string>('POSTGRES_PASSWORD'),
    database: configService.get<string>('POSTGRES_DB'),
    entities: [User, AdminUser, AdminProfile, Role, Permission],
    autoLoadEntities: true,
    synchronize: configService.get<string>('NODE_ENV') == 'environment',
  }),
};
