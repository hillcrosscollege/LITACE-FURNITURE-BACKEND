// products/entity/product.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductStatus } from '../enum/product.enum';
import { Category } from '../../categories/entity/category.entity';
import { ProductImage } from './product-image.entity';
import { ProductVariant } from './product-variant.entity';
import { VariantAttribute } from './variant-attribute.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // @Column({ unique: true })
  // sku: string;

  // @Column({ unique: true })
  // slug: string;

  @ManyToOne(() => Category, { nullable: false, eager: false })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id' })
  categoryId: string;

  // @Column({ nullable: true, type: 'varchar' })
  // brand: string | null;

  @Column({ name: 'short_description', type: 'text', nullable: true })
  shortDescription: string | null;

  @Column({ name: 'full_description', type: 'text', nullable: true })
  fullDescription: string | null;

  // ─── Pricing ────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  // Strike-through "was" price — maps to originalPrice on the frontend list
  @Column({
    name: 'compare_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  comparePrice: number | null;

  // Internal only — never returned unless explicitly selected
  @Column({
    name: 'cost_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    select: false,
  })
  costPrice: number | null;

  // ─── Inventory ──────────────────────────────────────────────────────────

  @Column({ name: 'track_inventory', default: true })
  trackInventory: boolean;

  @Column({ default: 0 })
  quantity: number;

  @Column({ name: 'low_stock_threshold', default: 5 })
  lowStockThreshold: number;

  @Column({ name: 'allow_backorders', default: false })
  allowBackorders: boolean;

  // ─── Variants ───────────────────────────────────────────────────────────

  @Column({ name: 'has_variants', default: false })
  hasVariants: boolean;

  @OneToMany(() => VariantAttribute, (attr) => attr.product, { cascade: true })
  variantAttributes: VariantAttribute[];

  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
  })
  variants: ProductVariant[];

  // ─── Shipping ───────────────────────────────────────────────────────────

  // @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  // weight: number | null; // kg

  // @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  // length: number | null; // cm

  // @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  // width: number | null;

  // @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  // height: number | null;

  @Column({ name: 'shipping_class', nullable: true, type: 'varchar' })
  shippingClass: string | null;

  @Column({ name: 'free_shipping', default: false })
  freeShipping: boolean;

  // ─── SEO ────────────────────────────────────────────────────────────────

  // @Column({ name: 'meta_title', nullable: true, type: 'varchar' })
  // metaTitle: string | null;

  // @Column({ name: 'meta_description', type: 'text', nullable: true })
  // metaDescription: string | null;

  // ─── Status & images ────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @OneToMany(() => ProductImage, (image) => image.product, { cascade: true })
  images: ProductImage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
