// admin/entity/admin-user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entity/roles.entity';
import { AdminRole, AdminStatus } from 'src/admin/core/enum/admin_enum';
import { AdminProfile } from 'src/admin/admin-profiles/entity/admin-profile.entity';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  // Assigned by superadmin during approval — null while pending
  @ManyToOne(() => Role, (role) => role.adminUsers, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'role_id' })
  role: Role | null;

  @Column({ name: 'role_id', nullable: true })
  roleId: string | null;

  // Fine-grained role assigned by superadmin (Inventory Manager, etc.)
  // @ManyToOne(() => Role, (role) => role.admins, {
  //   nullable: true,
  //   eager: false,
  // })
  // pending → active → inactive
  @Column({ type: 'enum', enum: AdminStatus, default: AdminStatus.PENDING })
  status: AdminStatus;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  // Which superadmin approved this account
  @ManyToOne(() => AdminUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: AdminUser | null;

  @Column({ name: 'approved_by_id', nullable: true })
  approvedById: string | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @OneToOne(() => AdminProfile, (profile) => profile.id)
  profile: AdminProfile;

  // @OneToMany(() => AdminRefreshToken, (token) => token.adminUser)
  // refreshTokens: AdminRefreshToken[];
  //   // Hashed refresh token — nulled on logout/password reset
  @Column({
    name: 'refresh_token_hash',
    type: 'text',
    nullable: true,
    select: false,
  })
  refreshTokenHash: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Derived, not persisted — one source of truth (role.isSystem)
  get loginRole(): AdminRole {
    return this.role?.isSystem ? AdminRole.SUPERADMIN : AdminRole.ADMIN;
  }
}

// import { AdminRole, AdminStatus } from 'src/admin/core/enum/admin_enum';
// import { Role } from 'src/admin/roles/entity/roles.entity';
// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   ManyToOne,
//   JoinColumn,
//   CreateDateColumn,
//   UpdateDateColumn,
// } from 'typeorm';

// @Entity('admins')
// export class Admin {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ name: 'first_name' })
//   firstName: string;

//   @Column({ name: 'last_name' })
//   lastName: string;

//   @Column({ unique: true, nullable: false })
//   email: string;

//   @Column({ select: false })
//   password: string;

//   @Column({ nullable: true })
//   phone: string | null;

//   @Column({ name: 'avatar_url', nullable: true })
//   avatarUrl: string | null;

//   @Column({ nullable: true })
//   department: string | null;

//   @Column({ name: 'employee_id', nullable: true, unique: true })
//   employeeId: string | null;

//   // Coarse role: superadmin or admin
//   @Column({
//     type: 'enum',
//     enum: AdminRole,
//     default: AdminRole.ADMIN,
//   })
//   role: AdminRole;

//   // Fine-grained role assigned by superadmin (Inventory Manager, etc.)
//   @ManyToOne(() => Role, (role) => role.admins, {
//     nullable: true,
//     eager: false,
//   })
//   @JoinColumn({ name: 'role_id' })
//   customRole: Role | null;

//   @Column({ name: 'role_id', nullable: true })
//   roleId: string | null;

//   // pending → active → inactive
//   @Column({
//     type: 'enum',
//     enum: AdminStatus,
//     default: AdminStatus.PENDING,
//   })
//   status: AdminStatus;

//   @Column({ name: 'is_email_verified', default: false })
//   isEmailVerified: boolean;

//   // Internal notes added by superadmin
//   @Column({ type: 'text', nullable: true })
//   notes: string | null;

//   // Which superadmin approved this admin
//   @ManyToOne(() => Admin, { nullable: true, onDelete: 'SET NULL' })
//   @JoinColumn({ name: 'approved_by_id' })
//   approvedBy: Admin | null;

//   @Column({ name: 'approved_by_id', nullable: true })
//   approvedById: string | null;

//   @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
//   approvedAt: Date | null;

//   // Hashed refresh token — nulled on logout/password reset
//   @Column({
//     name: 'refresh_token_hash',
//     type: 'text',
//     nullable: true,
//     select: false,
//   })
//   refreshTokenHash: string | null;

//   @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
//   lastLoginAt: Date | null;

//   @CreateDateColumn({ name: 'created_at' })
//   createdAt: Date;

//   @UpdateDateColumn({ name: 'updated_at' })
//   updatedAt: Date;
// }
