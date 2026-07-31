import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  CurrentUser,
  type JwtPayload,
} from 'src/core/common/decorators/current_user.decorator';
import { JwtRefreshGuard } from 'src/core/common/gaurds/jwt_refresh_auth.gaurd';
import {
  RegisterResponseDto,
  MessageResponseDto,
  AuthTokensDto,
} from './dto/auth.response.dto';
import { Public } from 'src/core/common/decorators/public.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── POST /auth/register ──────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiResponse({ status: 201, type: RegisterResponseDto })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async register(@Body() user: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(user);
  }

  // ─── GET /auth/verify-email?token=xxx ─────────────────────────────────────────

  @Public()
  @Get('verify-email')
  @ApiOperation({
    summary: 'Verify email using token from registration response',
  })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'JWT verification token',
  })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  async verifyEmail(
    @Query('token') token: string,
  ): Promise<MessageResponseDto> {
    return this.authService.verifyEmail(token);
  }

  // ─── POST /auth/login ─────────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AuthTokensDto })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or email not verified',
  })
  async login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.authService.login(dto);
  }

  // ─── POST /auth/refresh ───────────────────────────────────────────────────────

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Rotate access + refresh tokens using a valid refresh token',
  })
  @ApiResponse({ status: 200, type: AuthTokensDto })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired' })
  async refresh(@CurrentUser() user: JwtPayload): Promise<AuthTokensDto> {
    return this.authService.refreshTokens(user.sub, user.email, user.role);
  }

  // ─── POST /auth/logout ────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async logout(
    @CurrentUser('sub') userId: string,
  ): Promise<MessageResponseDto> {
    return this.authService.logout(userId);
  }

  // ─── POST /auth/forgot-password ───────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset token' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(dto);
  }

  // ─── POST /auth/reset-password ────────────────────────────────────────────────

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from forgot-password' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.resetPassword(dto);
  }

  // ─── GET /auth/me ─────────────────────────────────────────────────────────────

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user info' })
  @ApiResponse({
    status: 200,
    description: 'Returns the JWT payload of the logged-in user',
  })
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
