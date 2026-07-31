// admin/core/strategies/admin_jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminService } from 'src/admin/admin/admin.service';
import { AdminStatus } from '../enum/admin_enum';
import { AdminJwtPayload } from '../decorators/current_admin.decorator';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    configService: ConfigService,
    private readonly adminService: AdminService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('ADMIN_JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AdminJwtPayload) {
    const admin = await this.adminService.findByIdWithRole(payload.sub);

    if (!admin) {
      throw new UnauthorizedException('Admin account not found');
    }

    // if (admin.status !== AdminStatus.ACTIVE) {
    //   throw new UnauthorizedException(
    //     admin.status === AdminStatus.PENDING
    //       ? 'Your account is awaiting superadmin approval'
    //       : 'Your account has been deactivated',
    //   );
    // }

    const permissions = admin.role?.permissions?.map((p) => p.key) ?? [];

    return {
      sub: admin.id,
      email: admin.email,
      role: admin.loginRole,
      status: admin.status,
      permissions,
    } satisfies AdminJwtPayload;
  }
}

// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { PassportStrategy } from '@nestjs/passport';
// import { InjectRepository } from '@nestjs/typeorm';
// import { ExtractJwt, Strategy } from 'passport-jwt';
// import { Repository } from 'typeorm';
// import { AdminStatus } from '../enum/admin_enum';
// import { AdminJwtPayload } from '../decorators/current_admin.decorator';
// import { AdminUser } from 'src/admin/admin/entity/admin-entity';

// @Injectable()
// export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
//   constructor(
//     configService: ConfigService,
//     @InjectRepository(AdminUser)
//     private readonly adminsRepo: Repository<AdminUser>,
//   ) {
//     super({
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       ignoreExpiration: false,
//       // Completely separate secret from customer JWT
//       secretOrKey: configService.get<string>('ADMIN_JWT_ACCESS_SECRET'),
//     });
//   }

//   async validate(payload: AdminJwtPayload) {
//     const admin = await this.adminsRepo.findOne({
//       where: { id: payload.sub },
//       relations: {
//         role: {
//           permissions: true,
//         },
//       },
//     });

//     if (!admin) {
//       throw new UnauthorizedException('Admin account not found');
//     }

//     if (admin.status !== AdminStatus.ACTIVE) {
//       throw new UnauthorizedException(
//         admin.status === AdminStatus.PENDING
//           ? 'Your account is awaiting superadmin approval'
//           : 'Your account has been deactivated',
//       );
//     }

//     // Build permissions array from the custom role
//     const permissions = admin.role?.permissions?.map((p) => p.key) ?? [];

//     // This becomes req.user
//     return {
//       sub: admin.id,
//       email: admin.email,
//       role: admin.loginRole,
//       status: admin.status,
//       permissions,
//     } satisfies AdminJwtPayload;
//   }
// }
