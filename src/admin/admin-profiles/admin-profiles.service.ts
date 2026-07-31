// import {
//   BadRequestException,
//   ConflictException,
//   ForbiddenException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import * as bcrypt from 'bcrypt';
// import { User } from 'src/user/entity/user.entity';
// import { Permission } from '../permissions/entity/permission.entity';
// import { Role } from '../roles/entity/roles.entity';
// import { AdminProfile } from './entity/admin-profile.entity';

// const SALT_ROUNDS = 12;

// @Injectable()
// export class AdminService {
//   constructor(
//     @InjectRepository(User)
//     private readonly usersRepo: Repository<User>,

//     @InjectRepository(AdminProfile)
//     private readonly adminProfileRepo: Repository<AdminProfile>,

//     @InjectRepository(Role)
//     private readonly rolesRepo: Repository<Role>,

//     @InjectRepository(Permission)
//     private readonly permissionsRepo: Repository<Permission>,
//   ) {}

//   // ─── Admin User Management (Superadmin only) ──────────────────────────────

//   async createAdmin(dto: CreateAdminDto, createdById: string) {
//     // Check email uniqueness
//     const existing = await this.usersRepo.findOne({
//       where: { email: dto.email.toLowerCase() },
//     });
//     if (existing) {
//       throw new ConflictException('An account with this email already exists');
//     }

//     // Validate role if provided
//     let adminRole: Role | null = null;
//     if (dto.roleId) {
//       adminRole = await this.rolesRepo.findOne({ where: { id: dto.roleId } });
//       if (!adminRole) throw new NotFoundException('Role not found');
//     }

//     const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

//     // Create the user row
//     const user = this.usersRepo.create({
//       firstName: dto.firstName,
//       lastName: dto.lastName,
//       email: dto.email.toLowerCase(),
//       password: passwordHash,
//       role: RoleEnum.ADMIN,
//       isActive: dto.isActive ?? true,
//       isEmailVerified: true, // admins are created by superadmin, no email verification needed
//     });
//     const savedUser = await this.usersRepo.save(user);

//     // Create the admin profile
//     const profile = this.adminProfileRepo.create({
//       userId: savedUser.id,
//       department: dto.department ?? null,
//       employeeId: dto.employeeId ?? null,
//       notes: dto.notes ?? null,
//       adminRoleId: adminRole?.id ?? null,
//       createdById,
//     });
//     await this.adminProfileRepo.save(profile);

//     return this.findAdminById(savedUser.id);
//   }

//   async findAllAdmins() {
//     return this.usersRepo
//       .createQueryBuilder('user')
//       .leftJoinAndSelect(
//         'user.adminProfile',
//         'profile',
//         // We join via subquery since User doesn't have a direct relation to AdminProfile
//         // This is resolved via AdminProfile.userId
//       )
//       .where('user.role = :role', { role: RoleEnum.ADMIN })
//       .orderBy('user.createdAt', 'DESC')
//       .getMany();
//   }

//   async getAllAdmins() {
//     // Cleaner approach — query from AdminProfile side so we get profile data easily
//     return this.adminProfileRepo.find({
//       relations: ['user', 'adminRole', 'createdBy'],
//       order: { createdAt: 'DESC' },
//     });
//   }

//   async findAdminById(userId: string) {
//     const profile = await this.adminProfileRepo.findOne({
//       where: { userId },
//       relations: ['user', 'adminRole', 'adminRole.permissions', 'createdBy'],
//     });
//     if (!profile) throw new NotFoundException('Admin not found');
//     return profile;
//   }

//   async updateAdmin(userId: string, dto: UpdateAdminDto) {
//     const profile = await this.adminProfileRepo.findOne({
//       where: { userId },
//       relations: ['user'],
//     });
//     if (!profile) throw new NotFoundException('Admin not found');

//     // Update User fields if provided
//     if (dto.firstName || dto.lastName || dto.isActive !== undefined) {
//       await this.usersRepo.update(userId, {
//         ...(dto.firstName && { firstName: dto.firstName }),
//         ...(dto.lastName && { lastName: dto.lastName }),
//         ...(dto.isActive !== undefined && { isActive: dto.isActive }),
//       });
//     }

//     // Validate and update role if provided
//     if (dto.roleId) {
//       const role = await this.rolesRepo.findOne({ where: { id: dto.roleId } });
//       if (!role) throw new NotFoundException('Role not found');
//       profile.adminRoleId = role.id;
//     }

//     // Update profile fields
//     if (dto.phone !== undefined) profile.phone = dto.phone;
//     if (dto.department !== undefined) profile.department = dto.department;
//     if (dto.employeeId !== undefined) profile.employeeId = dto.employeeId;
//     if (dto.notes !== undefined) profile.notes = dto.notes;

//     await this.adminProfileRepo.save(profile);
//     return this.findAdminById(userId);
//   }

//   async toggleAdminStatus(userId: string) {
//     const user = await this.usersRepo.findOne({
//       where: { id: userId, role: RoleEnum.ADMIN },
//     });
//     if (!user) throw new NotFoundException('Admin not found');

//     await this.usersRepo.update(userId, { isActive: !user.isActive });
//     return {
//       message: `Admin ${!user.isActive ? 'activated' : 'deactivated'} successfully`,
//     };
//   }

//   async deleteAdmin(userId: string) {
//     const user = await this.usersRepo.findOne({
//       where: { id: userId, role: RoleEnum.ADMIN },
//     });
//     if (!user) throw new NotFoundException('Admin not found');

//     // Soft approach: just deactivate instead of hard delete
//     // Uncomment the line below for hard delete instead
//     // await this.usersRepo.delete(userId);

//     await this.usersRepo.update(userId, { isActive: false });
//     return { message: 'Admin deactivated successfully' };
//   }

//   // ─── Role Management ──────────────────────────────────────────────────────

//   async createRole(dto: CreateRoleDto) {
//     const existing = await this.rolesRepo.findOne({
//       where: { name: dto.name },
//     });
//     if (existing)
//       throw new ConflictException('A role with this name already exists');

//     const permissions = await this.permissionsRepo.findByIds(dto.permissions);
//     if (permissions.length !== dto.permissions.length) {
//       throw new BadRequestException('One or more permission IDs are invalid');
//     }

//     const role = this.rolesRepo.create({
//       name: dto.name,
//       description: dto.description,
//       permissions,
//     });

//     return this.rolesRepo.save(role);
//   }

//   async getAllRoles() {
//     return this.rolesRepo.find({
//       relations: ['permissions'],
//       order: { createdAt: 'DESC' },
//     });
//   }

//   async getRoleById(id: string) {
//     const role = await this.rolesRepo.findOne({
//       where: { id },
//       relations: ['permissions', 'adminProfiles', 'adminProfiles.user'],
//     });
//     if (!role) throw new NotFoundException('Role not found');
//     return role;
//   }

//   async updateRole(id: string, dto: UpdateRoleDto) {
//     const role = await this.rolesRepo.findOne({
//       where: { id },
//       relations: ['permissions'],
//     });
//     if (!role) throw new NotFoundException('Role not found');
//     if (role.isSystem)
//       throw new ForbiddenException('System roles cannot be modified');

//     if (dto.name) role.name = dto.name;
//     if (dto.description !== undefined) role.description = dto.description;

//     if (dto.permissions) {
//       const permissions = await this.permissionsRepo.findByIds(dto.permissions);
//       if (permissions.length !== dto.permissions.length) {
//         throw new BadRequestException('One or more permission IDs are invalid');
//       }
//       role.permissions = permissions;
//     }

//     return this.rolesRepo.save(role);
//   }

//   async deleteRole(id: string) {
//     const role = await this.rolesRepo.findOne({ where: { id } });
//     if (!role) throw new NotFoundException('Role not found');
//     if (role.isSystem)
//       throw new ForbiddenException('System roles cannot be deleted');

//     await this.rolesRepo.delete(id);
//     return { message: 'Role deleted successfully' };
//   }

//   // ─── Permission Management ────────────────────────────────────────────────

//   async getAllPermissions() {
//     const permissions = await this.permissionsRepo.find({
//       order: { group: 'ASC', label: 'ASC' },
//     });

//     // Group permissions by their group field (matches PermissionGroup frontend type)
//     const grouped = permissions.reduce(
//       (acc, perm) => {
//         if (!acc[perm.group]) acc[perm.group] = [];
//         acc[perm.group].push({ id: perm.id, label: perm.label });
//         return acc;
//       },
//       {} as Record<string, { id: string; label: string }[]>,
//     );

//     return Object.entries(grouped).map(([group, perms]) => ({
//       group,
//       permissions: perms,
//     }));
//   }
// }
