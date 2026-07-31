import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from 'src/user/user.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Register ─────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const user = await this.usersService.createCustomer({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: dto.password,
      phone: dto.phone,
    });

    // Sign a short-lived verification JWT
    // It carries purpose: 'email-verification' so it can't be used as an access token
    const verificationToken = this.jwtService.sign(
      { sub: user.id, purpose: 'email-verification' },
      {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: '24h',
      },
    );

    // TODO (production): send email with link:
    // `${frontendUrl}/verify-email?token=${verificationToken}`
    // For now, return it in the response so you can test without a mailer.

    return {
      message: 'Registration successful. Please verify your email to continue.',
      token: verificationToken, // ← remove this field when mailer is connected
    };
  }

  // ─── Verify email ─────────────────────────────────────────────────────────────

  async verifyEmail(token: string) {
    let payload: { sub: string; purpose: string };

    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });
    } catch {
      throw new BadRequestException(
        'Verification link is invalid or has expired',
      );
    }

    if (payload.purpose !== 'email-verification') {
      throw new BadRequestException('Invalid verification token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified. You can log in.' };
    }

    await this.usersService.markEmailVerified(user.id);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  // ─── Login ────────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    // Explicitly select password (select: false on entity)
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user) {
      // Use the same message for wrong email or wrong password — avoids email enumeration
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await this.usersService.validatePassword(
      dto.password,
      user.password,
    );
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Hash the refresh token before storing (never store raw tokens)
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersService.setRefreshTokenHash(user.id, refreshHash);
    await this.usersService.updateLastLogin(user.id);

    return tokens;
  }

  // ─── Forgot password ──────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    // IMPORTANT: always return the same response whether the email exists or not
    // This prevents email enumeration attacks
    if (!user) {
      return {
        message:
          'If an account with that email exists, a reset link has been sent.',
      };
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, purpose: 'password-reset' },
      {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: '15m', // short window — password reset tokens should expire fast
      },
    );

    // TODO (production): send email with link:
    // `${frontendUrl}/reset-password?token=${resetToken}`

    return {
      message:
        'If an account with that email exists, a reset link has been sent.',
      resetToken, // ← remove when mailer is connected
    };
  }

  // ─── Reset password ───────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    let payload: { sub: string; purpose: string };

    try {
      payload = this.jwtService.verify(dto.token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });
    } catch {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    if (payload.purpose !== 'password-reset') {
      throw new BadRequestException('Invalid reset token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const newHashedPassword = await bcrypt.hash(dto.newPassword, 12);

    // Updates password AND nulls out refreshTokenHash — kills all active sessions
    await this.usersService.updatePassword(user.id, newHashedPassword);

    return {
      message:
        'Password reset successfully. Please log in with your new password.',
    };
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────────

  async refreshTokens(userId: string, email: string, role: string) {
    const tokens = await this.generateTokens(userId, email, role);
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersService.setRefreshTokenHash(userId, refreshHash);
    return tokens;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────────

  async logout(userId: string) {
    // Null out the refresh token hash — invalidates the refresh token immediately
    await this.usersService.setRefreshTokenHash(userId, null);
    return { message: 'Logged out successfully' };
  }

  // ─── Token generation ─────────────────────────────────────────────────────────
  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessSecret = this.configService.get<string>('jwt.accessSecret')!;
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret')!;
    const accessExpiresIn = this.configService.get<string>(
      'jwt.accessExpiresIn',
      '15m',
    );
    const refreshExpiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
      '7d',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
