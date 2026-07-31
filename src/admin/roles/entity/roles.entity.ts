// roles/entity/roles.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Permission } from '../../permissions/entity/permission.entity';
import { AdminUser } from 'src/admin/admin/entity/admin-entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // "Super Admin", "Inventory Manager"

  @Column({ nullable: true, type: 'varchar', length: 500 })
  description: string | null;

  // true only for the protected Super Admin role — cannot be deleted,
  // and admin_users holding this role cannot be deactivated/deleted
  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @OneToMany(() => AdminUser, (admin) => admin.role)
  admins: AdminUser[];

  @ManyToMany(() => Permission, (permission) => permission.roles, {
    eager: false,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @OneToMany(() => AdminUser, (adminUser) => adminUser.role)
  adminUsers: AdminUser[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// import { Admin } from 'src/admin/admin/entity/admin-entity';
// import { Permission } from 'src/admin/permissions/entity/permission.entity';
// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   ManyToMany,
//   JoinTable,
//   OneToMany,
//   CreateDateColumn,
//   UpdateDateColumn,
// } from 'typeorm';

// @Entity('roles')
// export class Role {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   // e.g. "Inventory Manager", "Customer Support"
//   @Column({ unique: true })
//   name: string;

//   @Column({ nullable: true })
//   description: string;

//   // System roles cannot be deleted (e.g. default superadmin role)
//   @Column({ name: 'is_system', default: false })
//   isSystem: boolean;

//   @ManyToMany(() => Permission, (permission) => permission.roles, {
//     eager: true,
//   })
//   @JoinTable({
//     name: 'role_permissions',
//     joinColumn: { name: 'role_id', referencedColumnName: 'id' },
//     inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
//   })
//   permissions: Permission[];

//   @OneToMany(() => Admin, (admin) => admin.role)
//   admins: Admin[];

//   @CreateDateColumn({ name: 'created_at' })
//   createdAt: Date;

//   @UpdateDateColumn({ name: 'updated_at' })
//   updatedAt: Date;
// }
