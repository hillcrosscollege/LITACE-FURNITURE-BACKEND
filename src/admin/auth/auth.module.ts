// admin/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminAuthService } from './auth.service';
import { AdminAuthController } from './auth.controller';
import { AdminModule } from '../admin/admin.module';
import { AdminJwtStrategy } from '../core/strategies/admin_jwt.strategy';
import jwtConfig from 'src/core/config/jwt.config';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    AdminModule,
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync(jwtConfig),
  ],
  providers: [AdminAuthService, AdminJwtStrategy], // ← strategy added here
  controllers: [AdminAuthController],
})
export class AdminAuthModule {}

// import { Module } from '@nestjs/common';
// import { AdminAuthService } from './auth.service';
// import { AdminAuthController } from './auth.controller';
// import { AdminModule } from '../admin/admin.module';
// import { JwtModule } from '@nestjs/jwt';
// import jwtConfig from 'src/core/config/jwt.config';
// import { PassportModule } from '@nestjs/passport';
// import { AdminJwtStrategy } from '../core/strategies/admin_jwt.strategy';

// @Module({
//   imports: [
//     AdminModule,
//     PassportModule.register({ defaultStrategy: 'admin-jwt' }),
//     JwtModule.registerAsync(jwtConfig),
//   ],
//   providers: [AdminAuthService, AdminJwtStrategy],
//   controllers: [AdminAuthController],
// })
// export class AdminAuthModule {}
