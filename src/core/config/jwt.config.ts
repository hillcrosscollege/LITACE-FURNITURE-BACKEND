import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModuleAsyncOptions } from '@nestjs/jwt';

export const jwtConfig: JwtModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    // Default to access token config — individual signAsync calls
    // can override secret/expiresIn for refresh tokens
    secret: config.get<string>('ADMIN_JWT_ACCESS_SECRET'),
    signOptions: {
      expiresIn: config.get<string>(
        'ADMIN_JWT_ACCESS_SECRET_EXPIRES_IN',
      ) as any,
    },
  }),
};

export default jwtConfig;
