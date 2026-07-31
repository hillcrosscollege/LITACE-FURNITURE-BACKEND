// admin/admin.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import {
  ApproveAdminDto,
  AssignRoleDto,
  UpdateAdminBySupAdminDto,
} from './dto/admin.dto';
import { Role } from '../roles/entity/roles.entity';
import { AdminUser } from './entity/admin-entity';
import { AdminProfile } from '../admin-profiles/entity/admin-profile.entity';
import { AdminStatus } from '../core/enum/admin_enum';
import { AdminRegisterDto } from '../auth/dto/admin_register.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUsersRepo: Repository<AdminUser>,
    @InjectRepository(AdminProfile)
    private readonly adminProfilesRepo: Repository<AdminProfile>,
    // @InjectRepository(AdminRefreshToken)
    // private readonly refreshTokensRepo: Repository<AdminRefreshToken>,
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
  ) {}

  // ─── Raw lookups (no throwing — internal building blocks) ─────────────────

  async findByEmail(email: string): Promise<AdminUser | null> {
    return this.adminUsersRepo.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  /** Includes password hash + role/permissions — login only. */
  async findByEmailWithAuthDetails(email: string): Promise<AdminUser | null> {
    return this.adminUsersRepo
      .createQueryBuilder('admin')
      .addSelect('admin.password')
      .leftJoinAndSelect('admin.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .where('admin.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async findByIdWithRole(id: string): Promise<AdminUser | null> {
    return this.adminUsersRepo.findOne({
      where: { id },
      relations: { role: { permissions: true } },
    });
  }

  async findByIdBasic(id: string): Promise<AdminUser | null> {
    return this.adminUsersRepo.findOne({ where: { id } });
  }

  // ─── Public use-case methods (throw on not-found) ──────────────────────────

  async findAll(status?: AdminStatus) {
    const query = this.adminUsersRepo
      .createQueryBuilder('admin')
      .leftJoinAndSelect('admin.role', 'role')
      .leftJoinAndSelect('admin.profile', 'profile')
      .leftJoinAndSelect('admin.approvedBy', 'approvedBy')
      // exclude anyone holding a system (Super Admin) role from the staff list
      .where('(role.isSystem IS NULL OR role.isSystem = false)')
      .orderBy('admin.createdAt', 'DESC');

    if (status) {
      query.andWhere('admin.status = :status', { status });
    }

    return query.getMany();
  }

  async findPending() {
    return this.findAll(AdminStatus.PENDING);
  }

  async findById(id: string) {
    const admin = await this.adminUsersRepo.findOne({
      where: { id },
      relations: {
        role: { permissions: true },
        approvedBy: true,
        profile: true,
      },
    });
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  // ─── Registration / credentials ─────────────────────────────────────────

  // async createAdmin(
  //   dto: AdminRegisterDto,
  //   passwordHash: string,
  // ): Promise<AdminUser> {
  //   const admin = this.adminUsersRepo.create({
  //     firstName: dto.firstName,
  //     lastName: dto.lastName,
  //     email: dto.email.toLowerCase(),
  //     password: passwordHash,
  //     status: AdminStatus.PENDING,
  //     isEmailVerified: false,
  //   });
  //   const saved = await this.adminUsersRepo.save(admin);

  //   // profile row created up front, filled in later / at approval
  //   await this.adminProfilesRepo.save(
  //     this.adminProfilesRepo.create({
  //       adminUserId: saved.id,
  //       phone: dto.phone ?? null,
  //       department: dto.department ?? null,
  //     }),
  //   );

  //   return saved;
  // }

  // admin/admin.service.ts

  async createAdmin(
    dto: AdminRegisterDto,
    passwordHash: string,
  ): Promise<AdminUser> {
    const isFirstAdmin = (await this.adminUsersRepo.count()) === 0;

    let roleId: string | null = null;
    let status = AdminStatus.PENDING;
    let approvedAt: Date | null = null;

    if (isFirstAdmin) {
      const superAdminRole = await this.getOrCreateSuperAdminRole();
      roleId = superAdminRole.id;
      // No one exists yet to approve them — bootstrap directly to active.
      // They still have to verify their email before they can log in.
      status = AdminStatus.ACTIVE;
      approvedAt = new Date();
    }

    const admin = this.adminUsersRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      password: passwordHash,
      status,
      roleId,
      approvedAt,
      isEmailVerified: false,
    });
    const saved = await this.adminUsersRepo.save(admin);

    await this.adminProfilesRepo.save(
      this.adminProfilesRepo.create({
        adminUserId: saved.id,
        phone: dto.phone ?? null,
        department: dto.department ?? null,
      }),
    );

    return saved;
  }

  private async getOrCreateSuperAdminRole(): Promise<Role> {
    const existing = await this.rolesRepo.findOne({
      where: { isSystem: true },
    });
    if (existing) return existing;

    const role = this.rolesRepo.create({
      name: 'Super Admin',
      description: 'Full access to all features',
      isSystem: true,
      // No permissions attached — see note below on how you want
      // "superadmin bypasses permission checks" to actually work.
    });
    return this.rolesRepo.save(role);
  }
  async setEmailVerified(id: string): Promise<void> {
    await this.adminUsersRepo.update(id, { isEmailVerified: true });
  }

  async setPassword(id: string, passwordHash: string): Promise<void> {
    await this.adminUsersRepo.update(id, { password: passwordHash });
  }

  async setLastLoginAt(id: string, date: Date): Promise<void> {
    await this.adminUsersRepo.update(id, { lastLoginAt: date });
  }

  // ─── Refresh tokens ─────────────────────────────────────────────────────

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  // async issueRefreshToken(
  //   adminUserId: string,
  //   expiresInMs: number,
  //   meta?: { userAgent?: string; ipAddress?: string },
  // ): Promise<string> {
  //   const rawToken = randomBytes(64).toString('hex');
  //   const entry = this.refreshTokensRepo.create({
  //     adminUserId,
  //     tokenHash: this.hashToken(rawToken),
  //     expiresAt: new Date(Date.now() + expiresInMs),
  //     userAgent: meta?.userAgent ?? null,
  //     ipAddress: meta?.ipAddress ?? null,
  //   });
  //   await this.refreshTokensRepo.save(entry);
  //   return rawToken;
  // }

  // async findValidRefreshToken(rawToken: string): Promise<AdminRefreshToken | null> {
  //   const entry = await this.refreshTokensRepo.findOne({
  //     where: { tokenHash: this.hashToken(rawToken) },
  //   });
  //   if (!entry || entry.isRevoked || entry.expiresAt.getTime() < Date.now()) {
  //     return null;
  //   }
  //   return entry;
  // }

  // async revokeRefreshToken(id: string): Promise<void> {
  //   await this.refreshTokensRepo.update(id, { isRevoked: true });
  // }

  // async revokeAllRefreshTokens(adminUserId: string): Promise<void> {
  //   await this.refreshTokensRepo.update(
  //     { adminUserId, isRevoked: false },
  //     { isRevoked: true },
  //   );
  // }

  // ─── Profile ────────────────────────────────────────────────────────────

  async createProfileIfNotExists(adminUserId: string): Promise<AdminProfile> {
    const existing = await this.adminProfilesRepo.findOne({
      where: { adminUserId },
    });
    if (existing) return existing;
    return this.adminProfilesRepo.save(
      this.adminProfilesRepo.create({ adminUserId }),
    );
  }

  // ─── Approve admin ──────────────────────────────────────────────────────

  async approve(id: string, dto: ApproveAdminDto, superAdminId: string) {
    const admin = await this.adminUsersRepo.findOne({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    if (admin.status !== AdminStatus.PENDING) {
      throw new BadRequestException(
        `Admin is already ${admin.status} — only pending admins can be approved`,
      );
    }
    if (!admin.isEmailVerified) {
      throw new BadRequestException(
        'Admin has not verified their email yet — cannot approve',
      );
    }

    const role = await this.rolesRepo.findOne({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    admin.roleId = role.id;
    admin.status = AdminStatus.ACTIVE;
    admin.approvedById = superAdminId;
    admin.approvedAt = new Date();
    await this.adminUsersRepo.save(admin);

    if (dto.employeeId || dto.notes) {
      await this.adminProfilesRepo.update(
        { adminUserId: id },
        {
          ...(dto.employeeId && { employeeId: dto.employeeId }),
          ...(dto.notes && { notes: dto.notes }),
        },
      );
    }

    return this.findById(id);
  }

  // ─── Update admin ───────────────────────────────────────────────────────

  async update(id: string, dto: UpdateAdminBySupAdminDto) {
    const admin = await this.adminUsersRepo.findOne({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    await this.adminUsersRepo.update(id, {
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
    });

    await this.adminProfilesRepo.update(
      { adminUserId: id },
      {
        ...(dto.department !== undefined && { department: dto.department }),
        ...(dto.employeeId !== undefined && { employeeId: dto.employeeId }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    );

    return this.findById(id);
  }

  // ─── Update status ──────────────────────────────────────────────────────

  // async updateStatus(id: string, dto: UpdateAdminStatusDto) {
  //   const admin = await this.adminUsersRepo.findOne({
  //     where: { id },
  //     relations: { role: true },
  //   });
  //   if (!admin) throw new NotFoundException('Admin not found');

  //   if (dto.status === AdminStatus.PENDING) {
  //     throw new BadRequestException('Cannot manually set status back to pending');
  //   }
  //   if (admin.role?.isSystem) {
  //     throw new ForbiddenException('Superadmin status cannot be changed');
  //   }

  //   await this.adminUsersRepo.update(id, { status: dto.status });

  //   if (dto.status === AdminStatus.INACTIVE) {
  //     await this.revokeAllRefreshTokens(id); // kill sessions immediately
  //   }

  //   return {
  //     message: `Admin ${dto.status === AdminStatus.ACTIVE ? 'activated' : 'deactivated'} successfully`,
  //   };
  // }

  // ─── Assign role ────────────────────────────────────────────────────────

  async assignRole(id: string, dto: AssignRoleDto) {
    const admin = await this.adminUsersRepo.findOne({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    const role = await this.rolesRepo.findOne({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    await this.adminUsersRepo.update(id, { roleId: role.id });
    return this.findById(id);
  }

  // ─── Delete admin ───────────────────────────────────────────────────────

  // async remove(id: string) {
  //   const admin = await this.adminUsersRepo.findOne({
  //     where: { id },
  //     relations: { role: true },
  //   });
  //   if (!admin) throw new NotFoundException('Admin not found');

  //   if (admin.role?.isSystem) {
  //     throw new ForbiddenException('Superadmin accounts cannot be deleted');
  //   }

  //   await this.adminUsersRepo.update(id, { status: AdminStatus.INACTIVE });
  //   await this.revokeAllRefreshTokens(id);
  //   return { message: 'Admin account deactivated successfully' };
  // }
}

// import {
//   BadRequestException,
//   ForbiddenException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import {
//   ApproveAdminDto,
//   AssignRoleDto,
//   UpdateAdminBySupAdminDto,
//   UpdateAdminStatusDto,
// } from './dto/admin.dto';
// import { Admin } from './entity/admin-entity';
// import { AdminRole, AdminStatus } from '../core/enum/admin_enum';
// import { Role } from '../roles/entity/roles.entity';

// @Injectable()
// export class AdminService {
//   constructor(
//     @InjectRepository(Admin)
//     private readonly adminsRepo: Repository<Admin>,

//     @InjectRepository(Role)
//     private readonly rolesRepo: Repository<Role>,
//   ) {}

//   // ─── List admins ───────────────────────────────────────────────────────────

//   async findAll(status?: AdminStatus) {
//     const query = this.adminsRepo
//       .createQueryBuilder('admin')
//       .leftJoinAndSelect('admin.customRole', 'role')
//       .leftJoinAndSelect('admin.approvedBy', 'approvedBy')
//       .where('admin.role = :role', { role: AdminRole.ADMIN }) // exclude superadmin
//       .orderBy('admin.createdAt', 'DESC');

//     if (status) {
//       query.andWhere('admin.status = :status', { status });
//     }

//     return query.getMany();
//   }

//   async findPending() {
//     return this.findAll(AdminStatus.PENDING);
//   }

//   async findById(id: string) {
//     const admin = await this.adminsRepo.findOne({
//       where: { id },
//       relations: {
//         customRole: {
//           permissions: true,
//         },
//         approvedBy: true,
//       },
//     });
//     if (!admin) throw new NotFoundException('Admin not found');
//     return admin;
//   }

//   // ─── Approve admin ────────────────────────────────────────────────────────

//   async approve(id: string, dto: ApproveAdminDto, superAdminId: string) {
//     const admin = await this.adminsRepo.findOne({ where: { id } });
//     if (!admin) throw new NotFoundException('Admin not found');

//     if (admin.status !== AdminStatus.PENDING) {
//       throw new BadRequestException(
//         `Admin is already ${admin.status} — only pending admins can be approved`,
//       );
//     }

//     if (!admin.isEmailVerified) {
//       throw new BadRequestException(
//         'Admin has not verified their email yet — cannot approve',
//       );
//     }

//     // Validate and assign role if provided
//     if (dto.roleId) {
//       const role = await this.rolesRepo.findOne({ where: { id: dto.roleId } });
//       if (!role) throw new NotFoundException('Role not found');
//       admin.roleId = role.id;
//     }

//     admin.status = AdminStatus.ACTIVE;
//     admin.approvedById = superAdminId;
//     admin.approvedAt = new Date();
//     if (dto.employeeId) admin.employeeId = dto.employeeId;
//     if (dto.notes) admin.notes = dto.notes;

//     await this.adminsRepo.save(admin);
//     return this.findById(id);
//   }

//   // ─── Update admin ─────────────────────────────────────────────────────────

//   async update(id: string, dto: UpdateAdminBySupAdminDto) {
//     const admin = await this.adminsRepo.findOne({ where: { id } });
//     if (!admin) throw new NotFoundException('Admin not found');

//     Object.assign(admin, {
//       ...(dto.firstName && { firstName: dto.firstName }),
//       ...(dto.lastName && { lastName: dto.lastName }),
//       ...(dto.department !== undefined && { department: dto.department }),
//       ...(dto.employeeId !== undefined && { employeeId: dto.employeeId }),
//       ...(dto.notes !== undefined && { notes: dto.notes }),
//     });

//     await this.adminsRepo.save(admin);
//     return this.findById(id);
//   }

//   // ─── Update status ────────────────────────────────────────────────────────

//   async updateStatus(id: string, dto: UpdateAdminStatusDto) {
//     const admin = await this.adminsRepo.findOne({ where: { id } });
//     if (!admin) throw new NotFoundException('Admin not found');

//     // Prevent changing status to pending manually
//     if (dto.status === AdminStatus.PENDING) {
//       throw new BadRequestException(
//         'Cannot manually set status back to pending',
//       );
//     }

//     // Prevent deactivating a superadmin
//     if (admin.role === AdminRole.SUPERADMIN) {
//       throw new ForbiddenException('Superadmin status cannot be changed');
//     }

//     await this.adminsRepo.update(id, { status: dto.status });
//     return {
//       message: `Admin ${dto.status === AdminStatus.ACTIVE ? 'activated' : 'deactivated'} successfully`,
//     };
//   }

//   // ─── Assign role ──────────────────────────────────────────────────────────

//   async assignRole(id: string, dto: AssignRoleDto) {
//     const admin = await this.adminsRepo.findOne({ where: { id } });
//     if (!admin) throw new NotFoundException('Admin not found');

//     const role = await this.rolesRepo.findOne({ where: { id: dto.roleId } });
//     if (!role) throw new NotFoundException('Role not found');

//     await this.adminsRepo.update(id, { roleId: role.id });
//     return this.findById(id);
//   }

//   // ─── Delete admin ─────────────────────────────────────────────────────────

//   async remove(id: string) {
//     const admin = await this.adminsRepo.findOne({ where: { id } });
//     if (!admin) throw new NotFoundException('Admin not found');

//     if (admin.role === AdminRole.SUPERADMIN) {
//       throw new ForbiddenException('Superadmin accounts cannot be deleted');
//     }

//     // Soft delete — deactivate instead of hard delete for audit trail
//     await this.adminsRepo.update(id, { status: AdminStatus.INACTIVE });
//     return { message: 'Admin account deactivated successfully' };
//   }
// }
