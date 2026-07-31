// admin/entity/admin-profile.entity.ts
import { AdminUser } from 'src/admin/admin/entity/admin-entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('admin_profiles')
export class AdminProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => AdminUser, (adminUser) => adminUser.profile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'admin_user_id' })
  adminUser: AdminUser;

  @Column({ name: 'admin_user_id', unique: true })
  adminUserId: string;

  @Column({ name: 'avatar_url', nullable: true, type: 'text' })
  avatarUrl: string | null;

  @Column({ nullable: true, type: 'text' })
  phone: string | null;

  @Column({ nullable: true, type: 'text' })
  department: string | null;

  @Column({ name: 'employee_id', nullable: true, type: 'text', unique: true })
  employeeId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null; // internal note from superadmin, e.g. "Handles CT warehouse"

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   OneToOne,
//   ManyToOne,
//   JoinColumn,
//   CreateDateColumn,
//   UpdateDateColumn,
// } from 'typeorm';
// import { User } from '../../../user/entity/user.entity';
// import { Role } from 'src/admin/roles/entity/roles.entity';

// @Entity('admin_profiles')
// export class AdminProfile {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   // One-to-one with User
//   @OneToOne(() => User, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'user_id' })
//   user: User;

//   @Column({ name: 'user_id' })
//   userId: string;

//   @Column({ name: 'avatar_url', nullable: true })
//   avatarUrl: string | null;

//   @Column({ nullable: true })
//   phone: string | null;

//   @Column({ nullable: true })
//   department: string | null;

//   // Internal employee reference e.g. "EMP-001"
//   @Column({ name: 'employee_id', nullable: true, unique: true })
//   employeeId: string | null;

//   // The custom role assigned by superadmin (Inventory Manager, etc.)
//   // @ManyToOne(() => Role, (role) => role.adminProfiles, {
//   //   nullable: true,
//   //   eager: true,
//   // })
//   @JoinColumn({ name: 'admin_role_id' })
//   adminRole: Role | null;

//   @Column({ name: 'admin_role_id', nullable: true })
//   adminRoleId: string | null;

//   // Which superadmin created this admin — audit trail
//   @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
//   @JoinColumn({ name: 'created_by_id' })
//   createdBy: User | null;

//   @Column({ name: 'created_by_id', nullable: true })
//   createdById: string | null;

//   // Internal notes from superadmin e.g. "Handles Lagos warehouse"
//   @Column({ type: 'text', nullable: true })
//   notes: string | null;

//   @CreateDateColumn({ name: 'created_at' })
//   createdAt: Date;

//   @UpdateDateColumn({ name: 'updated_at' })
//   updatedAt: Date;
// }
