import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from '@nestjs/cache-manager';
import { cacheConfig } from './core/config/cache.config';
// import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './core/config/db.config';
import { PermissionsModule } from './admin/permissions/permissions.module';
import { RolesModule } from './admin/roles/roles.module';
import { AdminProfilesModule } from './admin/admin-profiles/admin-profiles.module';
import { AdminAuthModule } from './admin/auth/auth.module';
// import { AuthService } from './admin-specific/auth/auth.service';
// import { AuthController } from './admin-specific/auth/auth.controller';
import { AdminController } from './admin/admin/admin.controller';
import { AdminModule } from './admin/admin/admin.module';
import { CategoriesModule } from './admin/categories/categories.module';
import { ProductsModule } from './admin/products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(databaseConfig),
    CacheModule.registerAsync(cacheConfig),
    // PassportModule.register({ defaultStrategy: 'jwt' }),
    // JwtModule.registerAsync(jwtConfig),
    AdminAuthModule,
    UserModule,
    PermissionsModule,
    RolesModule,
    AdminProfilesModule,
    AdminModule,
    CategoriesModule,
    ProductsModule,
  ],
  controllers: [AppController, AdminController],
  providers: [AppService],
})
export class AppModule {}
