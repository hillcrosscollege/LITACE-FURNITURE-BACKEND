import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CategoryStatus } from '../enum/category.enum';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // @Column({ unique: true })
  // slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // @Column({ name: 'image_url', nullable: true, type: 'varchar' })
  // imageUrl: string | null;

  @Column({
    type: 'enum',
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE,
  })
  status: CategoryStatus;

  // @Column({ name: 'sort_order', default: 0 })
  // sortOrder: number;

  // @Column({ name: 'show_in_menu', default: true })
  // showInMenu: boolean;

  // Self-referencing: a category can belong to a parent category
  // @ManyToOne(() => Category, (category) => category.children, {
  //   nullable: true,
  //   onDelete: 'SET NULL', // deleting a parent doesn't cascade-delete children
  // })
  // @JoinColumn({ name: 'parent_id' })
  // parent: Category | null;

  // @Column({ name: 'parent_id', nullable: true })
  // parentId: string | null;

  // @OneToMany(() => Category, (category) => category.parent)
  // children: Category[];

  // @Column({ name: 'meta_title', nullable: true, type: 'varchar' })
  // metaTitle: string | null;

  // @Column({ name: 'meta_description', type: 'text', nullable: true })
  // metaDescription: string | null;

  // @Column({ name: 'meta_keywords', nullable: true, type: 'varchar' })
  // metaKeywords: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
