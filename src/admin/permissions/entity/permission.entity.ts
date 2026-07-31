// permissions/entity/permission.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entity/roles.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string; // "products.view"

  @Column()
  label: string; // "View Products"

  @Column()
  group: string; // "Products"

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// import { Role } from 'src/admin/roles/entity/roles.entity';
// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   ManyToMany,
//   CreateDateColumn,
//   UpdateDateColumn,
// } from 'typeorm';

// @Entity('permissions')
// export class Permission {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   // e.g. "products.view", "orders.create"
//   @Column({ unique: true })
//   key: string;

//   // e.g. "View Products"
//   @Column()
//   label: string;

//   // e.g. "Products", "Orders" — for UI grouping
//   @Column()
//   group: string;

//   @ManyToMany(() => Role, (role) => role.permissions)
//   roles: Role[];

//   @CreateDateColumn({ name: 'created_at' })
//   createdAt: Date;

//   @UpdateDateColumn({ name: 'updated_at' })
//   updatedAt: Date;
// }
