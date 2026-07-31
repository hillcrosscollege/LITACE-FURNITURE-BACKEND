import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AdminStatus } from 'src/admin/core/enum/admin_enum';

// Used by superadmin when approving a pending admin
export class ApproveAdminDto {
  @ApiProperty({
    example: 'uuid-of-role',
    required: false,
    description: 'Assign a role on approval',
  })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiProperty({ example: 'EMP-001', required: false })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({
    example: 'Handles Lagos warehouse inventory',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

// Used by superadmin to change an admin's status
export class UpdateAdminStatusDto {
  @ApiProperty({ enum: AdminStatus, example: AdminStatus.INACTIVE })
  @IsEnum(AdminStatus)
  status: AdminStatus;
}

// Used by superadmin to assign or change an admin's role
export class AssignRoleDto {
  @ApiProperty({ example: 'uuid-of-role' })
  @IsUUID()
  roleId: string;
}

// Used by superadmin to update any admin's basic info
export class UpdateAdminBySupAdminDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
