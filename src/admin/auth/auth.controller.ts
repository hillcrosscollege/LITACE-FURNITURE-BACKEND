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
import { Public } from 'src/core/common/decorators/public.decorator';
import { AdminJwtRefreshGuard } from '../core/gaurds/admin_jwt_refresh_auth_gaurd';
import { AdminAuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin_login.dto';
import {
  AdminForgotPasswordDto,
  AdminResetPasswordDto,
} from './dto/admin_password.dto';
import { AdminRegisterDto } from './dto/admin_register.dto';
import {
  type AdminJwtPayload,
  CurrentAdmin,
} from '../core/decorators/current_admin.decorator';
import { AdminJwtAuthGuard } from '../core/gaurds/admin_jwt_auth_gaurd';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  // POST /admin/auth/register
  @Public()
  @Post('register')
  @ApiOperation({
    summary:
      'Admin self-registration — account requires superadmin approval before login',
  })
  @ApiResponse({
    status: 201,
    description: 'Registered successfully, email verification sent',
  })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  register(@Body() dto: AdminRegisterDto) {
    return this.adminAuthService.register(dto);
  }

  // GET /admin/auth/verify-email?token=xxx
  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify admin email using token' })
  @ApiQuery({ name: 'token', required: true })
  @ApiResponse({
    status: 200,
    description: 'Email verified, pending superadmin approval',
  })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  verifyEmail(@Query('token') token: string) {
    return this.adminAuthService.verifyEmail(token);
  }

  // POST /admin/auth/login
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login — blocked if pending or inactive' })
  @ApiResponse({
    status: 200,
    description: 'Returns accessToken and refreshToken',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials / not verified / not approved',
  })
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }

  // POST /admin/auth/refresh
  // @UseGuards(AdminJwtRefreshGuard)
  // @Post('refresh')
  // @HttpCode(HttpStatus.OK)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Rotate access + refresh tokens' })
  // refresh(@CurrentAdmin() admin: AdminJwtPayload) {
  //   return this.adminAuthService.refresh(admin.sub);
  // }

  // POST /admin/auth/logout
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  logout(@CurrentAdmin('sub') adminId: string) {
    return this.adminAuthService.logout(adminId);
  }

  // GET /admin/auth/me
  @UseGuards(AdminJwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current logged-in admin info from JWT' })
  me(@CurrentAdmin() admin: AdminJwtPayload) {
    return admin;
  }

  // POST /admin/auth/forgot-password
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link' })
  forgotPassword(@Body() dto: AdminForgotPasswordDto) {
    return this.adminAuthService.forgotPassword(dto);
  }

  // POST /admin/auth/reset-password
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password using token — invalidates all sessions',
  })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  resetPassword(@Body() dto: AdminResetPasswordDto) {
    return this.adminAuthService.resetPassword(dto);
  }
}
