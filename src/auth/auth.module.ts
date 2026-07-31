import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { JwtStrategy } from 'src/core/common/strategies/jwt_access_strategy';
import { JwtRefreshStrategy } from 'src/core/common/strategies/jwt_refresh_strategy';
import jwtConfig from 'src/core/config/jwt.config';

@Module({
  imports: [
    UserModule,
    // PassportModule.register({ defaultStrategy: 'jwt' }),
    // JwtModule.registerAsync(jwtConfig),
  ],
  // providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
