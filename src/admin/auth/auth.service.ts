// admin-auth/admin-auth.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminLoginDto } from './dto/admin_login.dto';
import {
  AdminForgotPasswordDto,
  AdminResetPasswordDto,
} from './dto/admin_password.dto';
import { AdminRegisterDto } from './dto/admin_register.dto';
import { AdminService } from '../admin/admin.service';
import { AdminStatus } from '../core/enum/admin_enum';
import { AdminUser } from '../admin/entity/admin-entity';

const SALT_ROUNDS = 12;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Register ─────────────────────────────────────────────────────────────

  async register(dto: AdminRegisterDto) {
    const existing = await this.adminService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const saved = await this.adminService.createAdmin(dto, passwordHash);

    const verificationToken = this.jwtService.sign(
      { sub: saved.id, purpose: 'admin-email-verification' },
      {
        secret: this.configService.get<string>('ADMIN_JWT_ACCESS_SECRET'),
        expiresIn: '24h',
      },
    );

    // TODO: send verification email with link:
    // `${process.env.ADMIN_FRONTEND_URL}/verify-email?token=${verificationToken}`

    return {
      message:
        'Registration successful. Please verify your email. Your account will be reviewed by a superadmin before you can log in.',
      verificationToken, // remove when mailer is connected
    };
  }

  // ─── Verify email ─────────────────────────────────────────────────────────

  async verifyEmail(token: string) {
    let payload: { sub: string; purpose: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('ADMIN_JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new BadRequestException(
        'Verification link is invalid or has expired',
      );
    }

    if (payload.purpose !== 'admin-email-verification') {
      throw new BadRequestException('Invalid verification token');
    }

    const admin = await this.adminService.findByIdBasic(payload.sub);
    if (!admin) throw new BadRequestException('Account not found');

    if (admin.isEmailVerified) {
      return {
        message: 'Email already verified. Await superadmin approval to login.',
      };
    }

    await this.adminService.setEmailVerified(admin.id);
    await this.adminService.createProfileIfNotExists(admin.id);

    return {
      message:
        'Email verified successfully. Your account is pending superadmin approval.',
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: AdminLoginDto, meta?: RequestMeta) {
    const admin = await this.adminService.findByEmailWithAuthDetails(dto.email);

    // same message for wrong email or wrong password — prevents enumeration
    if (!admin) throw new UnauthorizedException('Invalid email or password');

    const passwordMatch = await bcrypt.compare(dto.password, admin.password);
    if (!passwordMatch)
      throw new UnauthorizedException('Invalid email or password');

    if (!admin.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }
    // if (admin.status === AdminStatus.PENDING) {
    //   throw new UnauthorizedException(
    //     'Your account is pending superadmin approval. You will be notified once approved.',
    //   );
    // }
    // if (admin.status === AdminStatus.INACTIVE) {
    //   throw new UnauthorizedException(
    //     'Your account has been deactivated. Contact a superadmin.',
    //   );
    // }

    const accessToken = await this.signAccessToken(admin);
    // const refreshToken = await this.adminService.issueRefreshToken(admin.id, REFRESH_TTL_MS, meta);
    await this.adminService.setLastLoginAt(admin.id, new Date());

    return { accessToken };
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────
  // adminId + usedTokenId come from AdminRefreshTokenGuard (validated the raw token already)

  async refresh(adminId: string, usedTokenId: string, meta?: RequestMeta) {
    const admin = await this.adminService.findByIdWithRole(adminId);
    if (!admin) throw new UnauthorizedException('Admin not found');

    // await this.adminService.revokeRefreshToken(usedTokenId); // rotation

    const accessToken = await this.signAccessToken(admin);
    // const refreshToken = await this.adminService.issueRefreshToken(admin.id, REFRESH_TTL_MS, meta);

    return { accessToken };
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(usedTokenId: string) {
    // await this.adminService.revokeRefreshToken(usedTokenId);
    return { message: 'Logged out successfully' };
  }

  // ─── Forgot password ──────────────────────────────────────────────────────

  async forgotPassword(dto: AdminForgotPasswordDto) {
    const admin = await this.adminService.findByEmail(dto.email);

    // always return the same message to prevent email enumeration
    if (!admin) {
      return {
        message:
          'If an account with that email exists, a reset link has been sent.',
      };
    }

    const resetToken = this.jwtService.sign(
      { sub: admin.id, purpose: 'admin-password-reset' },
      {
        secret: this.configService.get<string>('ADMIN_JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );

    // TODO: send reset email with link:
    // `${process.env.ADMIN_FRONTEND_URL}/reset-password?token=${resetToken}`

    return {
      message:
        'If an account with that email exists, a reset link has been sent.',
      resetToken, // remove when mailer is connected
    };
  }

  // ─── Reset password ───────────────────────────────────────────────────────

  async resetPassword(dto: AdminResetPasswordDto) {
    let payload: { sub: string; purpose: string };
    try {
      payload = this.jwtService.verify(dto.token, {
        secret: this.configService.get<string>('ADMIN_JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    if (payload.purpose !== 'admin-password-reset') {
      throw new BadRequestException('Invalid reset token');
    }

    const admin = await this.adminService.findByIdBasic(payload.sub);
    if (!admin) throw new BadRequestException('Account not found');

    const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.adminService.setPassword(admin.id, newHash);
    // await this.adminService.revokeAllRefreshTokens(admin.id); // kill every session

    return {
      message:
        'Password reset successfully. Please log in with your new password.',
    };
  }

  // ─── Token helpers ──────────────────────────────────────────────────────

  private async signAccessToken(admin: AdminUser): Promise<string> {
    const permissions = admin.role?.permissions?.map((p) => p.key) ?? [];

    const payload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role?.name ?? null,
      isSuperAdmin: admin.role?.isSystem ?? false,
      status: admin.status,
      permissions,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('ADMIN_JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>(
        'ADMIN_JWT_ACCESS_EXPIRES_IN',
        '15m',
      ) as any,
    });
  }
}

// import {
//   BadRequestException,
//   ConflictException,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { JwtService } from '@nestjs/jwt';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import * as bcrypt from 'bcrypt';
// import { AdminStatus } from '../core/enum/admin_enum';
// import { AdminLoginDto } from './dto/admin_login.dto';
// import {
//   AdminForgotPasswordDto,
//   AdminResetPasswordDto,
// } from './dto/admin_password.dto';
// import { AdminRegisterDto } from './dto/admin_register.dto';
// import { Admin } from '../admin/entity/admin-entity';

// const SALT_ROUNDS = 12;

// @Injectable()
// export class AdminAuthService {
//   constructor(
//     @InjectRepository(Admin)
//     private readonly adminsRepo: Repository<Admin>,
//     private readonly jwtService: JwtService,
//     private readonly configService: ConfigService,
//   ) {}

//   // ─── Register ─────────────────────────────────────────────────────────────

//   async register(dto: AdminRegisterDto) {
//     const existing = await this.adminsRepo.findOne({
//       where: { email: dto.email.toLowerCase() },
//     });
//     if (existing) {
//       throw new ConflictException('An account with this email already exists');
//     }

//     const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

//     const admin = this.adminsRepo.create({
//       firstName: dto.firstName,
//       lastName: dto.lastName,
//       email: dto.email.toLowerCase(),
//       password: passwordHash,
//       phone: dto.phone ?? null,
//       department: dto.department ?? null,
//       status: AdminStatus.PENDING, // must be approved by superadmin
//       isEmailVerified: false,
//     });

//     const saved = await this.adminsRepo.save(admin);

//     // Sign verification token
//     const verificationToken = this.jwtService.sign(
//       { sub: saved.id, purpose: 'admin-email-verification' },
//       {
//         secret: this.configService.get<string>('ADMIN_JWT_ACCESS_SECRET'),
//         expiresIn: '24h',
//       },
//     );

//     // TODO: send verification email with link:
//     // `${process.env.ADMIN_FRONTEND_URL}/verify-email?token=${verificationToken}`

//     return {
//       message:
//         'Registration successful. Please verify your email. Your account will be reviewed by a superadmin before you can log in.',
//       verificationToken, // remove when mailer is connected
//     };
//   }

//   // ─── Verify email ─────────────────────────────────────────────────────────

//   async verifyEmail(token: string) {
//     let payload: { sub: string; purpose: string };

//     try {
//       payload = this.jwtService.verify(token, {
//         secret: this.configService.get<string>('ADMIN_JWT_ACCESS_SECRET'),
//       });
//     } catch {
//       throw new BadRequestException(
//         'Verification link is invalid or has expired',
//       );
//     }

//     if (payload.purpose !== 'admin-email-verification') {
//       throw new BadRequestException('Invalid verification token');
//     }

//     const admin = await this.adminsRepo.findOne({ where: { id: payload.sub } });
//     if (!admin) throw new BadRequestException('Account not found');

//     if (admin.isEmailVerified) {
//       return {
//         message: 'Email already verified. Await superadmin approval to login.',
//       };
//     }

//     await this.adminsRepo.update(admin.id, { isEmailVerified: true });

//     return {
//       message:
//         'Email verified successfully. Your account is pending superadmin approval.',
//     };
//   }

//   // ─── Login ────────────────────────────────────────────────────────────────

//   async login(dto: AdminLoginDto) {
//     const admin = await this.adminsRepo
//       .createQueryBuilder('admin')
//       .addSelect('admin.password')
//       .leftJoinAndSelect('admin.customRole', 'role')
//       .leftJoinAndSelect('role.permissions', 'permissions')
//       .where('admin.email = :email', { email: dto.email.toLowerCase() })
//       .getOne();

//     // Same message for wrong email or wrong password — prevents enumeration
//     if (!admin) {
//       throw new UnauthorizedException('Invalid email or password');
//     }

//     const passwordMatch = await bcrypt.compare(dto.password, admin.password);
//     if (!passwordMatch) {
//       throw new UnauthorizedException('Invalid email or password');
//     }

//     if (!admin.isEmailVerified) {
//       throw new UnauthorizedException(
//         'Please verify your email before logging in',
//       );
//     }

//     if (admin.status === AdminStatus.PENDING) {
//       throw new UnauthorizedException(
//         'Your account is pending superadmin approval. You will be notified once approved.',
//       );
//     }

//     if (admin.status === AdminStatus.INACTIVE) {
//       throw new UnauthorizedException(
//         'Your account has been deactivated. Contact a superadmin.',
//       );
//     }

//     const tokens = await this.generateTokens(admin);

//     // Hash and store refresh token
//     const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
//     await this.adminsRepo.update(admin.id, {
//       refreshTokenHash: refreshHash,
//       lastLoginAt: new Date(),
//     });

//     return tokens;
//   }

//   // ─── Refresh ──────────────────────────────────────────────────────────────

//   async refresh(adminId: string) {
//     const admin = await this.adminsRepo.findOne({
//       where: { id: adminId },
//       relations: {
//         customRole: {
//           permissions: true,
//         },
//       },
//     });
//     if (!admin) throw new UnauthorizedException('Admin not found');

//     const tokens = await this.generateTokens(admin);
//     const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
//     await this.adminsRepo.update(admin.id, { refreshTokenHash: refreshHash });

//     return tokens;
//   }

//   // ─── Logout ───────────────────────────────────────────────────────────────

//   async logout(adminId: string) {
//     await this.adminsRepo.update(adminId, { refreshTokenHash: null });
//     return { message: 'Logged out successfully' };
//   }

//   // ─── Forgot password ──────────────────────────────────────────────────────

//   async forgotPassword(dto: AdminForgotPasswordDto) {
//     const admin = await this.adminsRepo.findOne({
//       where: { email: dto.email.toLowerCase() },
//     });

//     // Always return same message to prevent email enumeration
//     if (!admin) {
//       return {
//         message:
//           'If an account with that email exists, a reset link has been sent.',
//       };
//     }

//     const resetToken = this.jwtService.sign(
//       { sub: admin.id, purpose: 'admin-password-reset' },
//       {
//         secret: this.configService.get<string>('ADMIN_JWT_ACCESS_SECRET'),
//         expiresIn: '15m',
//       },
//     );

//     // TODO: send reset email with link:
//     // `${process.env.ADMIN_FRONTEND_URL}/reset-password?token=${resetToken}`

//     return {
//       message:
//         'If an account with that email exists, a reset link has been sent.',
//       resetToken, // remove when mailer is connected
//     };
//   }

//   // ─── Reset password ───────────────────────────────────────────────────────

//   async resetPassword(dto: AdminResetPasswordDto) {
//     let payload: { sub: string; purpose: string };

//     try {
//       payload = this.jwtService.verify(dto.token, {
//         secret: this.configService.get<string>('ADMIN_JWT_ACCESS_SECRET'),
//       });
//     } catch {
//       throw new BadRequestException('Reset link is invalid or has expired');
//     }

//     if (payload.purpose !== 'admin-password-reset') {
//       throw new BadRequestException('Invalid reset token');
//     }

//     const admin = await this.adminsRepo.findOne({ where: { id: payload.sub } });
//     if (!admin) throw new BadRequestException('Account not found');

//     const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

//     // Update password AND null refresh token — kills all active sessions
//     await this.adminsRepo.update(admin.id, {
//       password: newHash,
//       refreshTokenHash: null,
//     });

//     return {
//       message:
//         'Password reset successfully. Please log in with your new password.',
//     };
//   }

//   // ─── Token generation ─────────────────────────────────────────────────────

//   private async generateTokens(admin: Admin) {
//     const permissions = admin.customRole?.permissions?.map((p) => p.key) ?? [];

//     const payload = {
//       sub: admin.id,
//       email: admin.email,
//       role: admin.role,
//       status: admin.status,
//       permissions,
//     };

//     const accessSecret = this.configService.get<string>(
//       'ADMIN_JWT_ACCESS_SECRET',
//     )!;
//     const refreshSecret = this.configService.get<string>(
//       'ADMIN_JWT_REFRESH_SECRET',
//     )!;
//     const accessExpiresIn = this.configService.get<string>(
//       'ADMIN_JWT_ACCESS_EXPIRES_IN',
//       '15m',
//     );
//     const refreshExpiresIn = this.configService.get<string>(
//       'ADMIN_JWT_REFRESH_EXPIRES_IN',
//       '7d',
//     );

//     const [accessToken, refreshToken] = await Promise.all([
//       this.jwtService.signAsync(payload, {
//         secret: accessSecret,
//         expiresIn: accessExpiresIn as any,
//       }),
//       this.jwtService.signAsync(payload, {
//         secret: refreshSecret,
//         expiresIn: refreshExpiresIn as any,
//       }),
//     ]);

//     return { accessToken, refreshToken };
//   }
// }
