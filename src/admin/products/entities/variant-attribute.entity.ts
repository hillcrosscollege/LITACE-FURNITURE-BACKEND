// products/entity/variant-attribute.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

// Defines the picker options for a product, e.g. name: "Color", values: ["Red","Blue"]
@Entity('variant_attributes')
export class VariantAttribute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (product) => product.variantAttributes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @Column()
  name: string;

  @Column({ type: 'simple-array' })
  values: string[];

  // @Column({ name: 'sort_order', default: 0 })
  // sortOrder: number;
}
