// products/products.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { CreateVariantDto, UpdateVariantDto } from './dtos/manage-variant.dto';
import { QueryProductDto } from './dtos/query-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ProductImage } from './entities/product-image.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from './entities/product.entity';
import { VariantAttribute } from './entities/variant-attribute.entity';
import { ProductStatus, StockStatus } from './enum/product.enum';
import { CloudinaryService } from 'src/core/common/services/cloudinary/cloudinary.service';

// core/utils/slugify.ts
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepo: Repository<ProductVariant>,
    @InjectRepository(VariantAttribute)
    private readonly variantAttrsRepo: Repository<VariantAttribute>,
    @InjectRepository(ProductImage)
    private readonly imagesRepo: Repository<ProductImage>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly categoriesService: CategoriesService,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadImages(files: Express.Multer.File[]) {
    const uploads = await Promise.all(
      files.map((file) => this.cloudinaryService.uploadFile(file, 'products')),
    );

    return uploads.map((img) => ({
      url: img.secure_url,
      publicId: img.public_id,
    }));
  }

  // ─── Create ─────────────────────────────────────────────────────────────

  async create(dto: CreateProductDto) {
    await this.categoriesService.findOne(dto.category); // throws if missing
    // await this.assertSkuUnique(dto.sku);

    // const slug = await this.buildUniqueSlug(dto.slug ?? dto.name);

    return this.dataSource
      .transaction(async (manager) => {
        const product = manager.create(Product, {
          name: dto.name,
          // sku: dto.sku,
          // slug,
          categoryId: dto.category,
          // brand: dto.brand ?? null,
          shortDescription: dto.shortDescription ?? null,
          fullDescription: dto.fullDescription ?? null,
          price: dto.price,
          comparePrice: dto.comparePrice ?? null,
          costPrice: dto.costPrice ?? null,
          trackInventory: dto.trackInventory,
          quantity: dto.quantity ?? 0,
          lowStockThreshold: dto.lowStockThreshold ?? 5,
          allowBackorders: dto.allowBackorders ?? false,
          hasVariants: dto.hasVariants,
          weight: dto.weight ?? null,
          length: dto.length ?? null,
          width: dto.width ?? null,
          height: dto.height ?? null,
          shippingClass: dto.shippingClass ?? null,
          freeShipping: dto.freeShipping ?? false,
          // metaTitle: dto.metaTitle ?? null,
          // metaDescription: dto.metaDescription ?? null,
          status: dto.status ?? ProductStatus.DRAFT,
        });
        const savedProduct = await manager.save(product);

        if (dto.images?.length) {
          const images = dto.images.map((url, index) =>
            manager.create(ProductImage, {
              productId: savedProduct.id,
              imageUrl: url,
              isPrimary: index === 0,
              sortOrder: index,
            }),
          );
          await manager.save(images);
        }

        if (dto.hasVariants) {
          if (dto.variantAttributes?.length) {
            const attrs = dto.variantAttributes.map((a, index) =>
              manager.create(VariantAttribute, {
                productId: savedProduct.id,
                name: a.name,
                values: a.values,
                sortOrder: index,
              }),
            );
            await manager.save(attrs);
          }

          if (dto.variants?.length) {
            // this.assertUniqueSkusWithinBatch(dto.variants.map((v) => v.sku));
            const variants = dto.variants.map((v) =>
              manager.create(ProductVariant, {
                productId: savedProduct.id,
                name: v.name,
                // sku: v.sku,
                price: v.price,
                stock: v.stock,
                // imageUrl: v.image ?? null,
                attributes: v.attributes,
              }),
            );
            await manager.save(variants);
          }
        }

        return savedProduct.id;
      })
      .then((id) => this.findOne(id));
  }

  // ─── List ───────────────────────────────────────────────────────────────

  async findAll(query: QueryProductDto) {
    const qb = this.productsRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect(
        'product.images',
        'primaryImage',
        'primaryImage.isPrimary = true',
      )
      .orderBy('product.createdAt', 'DESC');

    if (query.search) {
      qb.andWhere('(product.name ILIKE :search OR product.sku ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.status) {
      qb.andWhere('product.status = :status', { status: query.status });
    } else {
      qb.andWhere('product.status != :trash', { trash: ProductStatus.TRASH });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);

    const [products, total] = await qb.getManyAndCount();

    // stockStatus filter applied after fetch since it's derived, not a column
    let results = products.map((p) => this.mapToListResponse(p));
    if (query.stockStatus) {
      const target = this.stockStatusLabel(query.stockStatus);
      results = results.filter((p) => p.stockStatus === target);
    }

    return { data: results, total, page, limit };
  }

  // ─── Get one (full detail, with variants/attributes/images) ───────────────

  async findOne(id: string) {
    const product = await this.productsRepo.findOne({
      where: { id },
      relations: {
        category: true,
        images: true,
        variants: true,
        variantAttributes: true,
      },
      // order: { images: { sortOrder: 'ASC' } },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.mapToDetailResponse(product);
  }

  // ─── Update ─────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.productsRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.category !== undefined) {
      await this.categoriesService.findOne(dto.category);
      product.categoryId = dto.category;
    }
    // if (dto.sku !== undefined && dto.sku !== product.sku) {
    //   await this.assertSkuUnique(dto.sku, id);
    //   product.sku = dto.sku;
    // }
    // if (dto.slug !== undefined && dto.slug !== product.slug) {
    //   product.slug = await this.buildUniqueSlug(dto.slug, id);
    // } else if (dto.name !== undefined && dto.slug === undefined) {
    //   product.slug = await this.buildUniqueSlug(dto.name, id);
    // }

    Object.assign(product, {
      ...(dto.name !== undefined && { name: dto.name }),
      // ...(dto.brand !== undefined && { brand: dto.brand }),
      ...(dto.shortDescription !== undefined && {
        shortDescription: dto.shortDescription,
      }),
      ...(dto.fullDescription !== undefined && {
        fullDescription: dto.fullDescription,
      }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.comparePrice !== undefined && { comparePrice: dto.comparePrice }),
      ...(dto.costPrice !== undefined && { costPrice: dto.costPrice }),
      ...(dto.trackInventory !== undefined && {
        trackInventory: dto.trackInventory,
      }),
      ...(dto.quantity !== undefined && { quantity: dto.quantity }),
      ...(dto.lowStockThreshold !== undefined && {
        lowStockThreshold: dto.lowStockThreshold,
      }),
      ...(dto.allowBackorders !== undefined && {
        allowBackorders: dto.allowBackorders,
      }),
      ...(dto.hasVariants !== undefined && { hasVariants: dto.hasVariants }),
      ...(dto.weight !== undefined && { weight: dto.weight }),
      ...(dto.length !== undefined && { length: dto.length }),
      ...(dto.width !== undefined && { width: dto.width }),
      ...(dto.height !== undefined && { height: dto.height }),
      ...(dto.shippingClass !== undefined && {
        shippingClass: dto.shippingClass,
      }),
      // ...(dto.freeShipping !== undefined && { freeShipping: dto.freeShipping }),
      // ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
      // ...(dto.metaDescription !== undefined && {
      //   metaDescription: dto.metaDescription,
      // }),
      ...(dto.status !== undefined && { status: dto.status }),
    });

    await this.productsRepo.save(product);

    if (dto.images !== undefined) {
      await this.imagesRepo.delete({ productId: id });
      if (dto.images.length) {
        const images = dto.images.map((url, index) =>
          this.imagesRepo.create({
            productId: id,
            imageUrl: url,
            isPrimary: index === 0,
            // sortOrder: index,
          }),
        );
        await this.imagesRepo.save(images);
      }
    }

    return this.findOne(id);
  }

  // ─── Variants (dedicated endpoints) ────────────────────────────────────

  // async addVariant(productId: string, dto: CreateVariantDto) {
  //   await this.findOne(productId); // throws if product missing
  //   // await this.assertVariantSkuUnique(dto.sku);

  //   const variant = this.variantsRepo.create({
  //     productId,
  //     name: dto.name,
  //     // sku: dto.sku,
  //     price: dto.price,
  //     stock: dto.stock,
  //     imageUrl: dto.image ?? null,
  //     attributes: dto.attributes,
  //   });
  //   await this.variantsRepo.save(variant);

  //   if (
  //     !(await this.productsRepo.findOne({
  //       where: { id: productId, hasVariants: true },
  //     }))
  //   ) {
  //     await this.productsRepo.update(productId, { hasVariants: true });
  //   }

  //   return this.findOne(productId);
  // }

  // async updateVariant(
  //   productId: string,
  //   variantId: string,
  //   dto: UpdateVariantDto,
  // ) {
  //   const variant = await this.variantsRepo.findOne({
  //     where: { id: variantId, productId },
  //   });
  //   if (!variant) throw new NotFoundException('Variant not found');

  //   // if (dto.sku !== undefined && dto.sku !== variant.sku) {
  //   //   await this.assertVariantSkuUnique(dto.sku, variantId);
  //   // }

  //   await this.variantsRepo.update(variantId, {
  //     ...(dto.name !== undefined && { name: dto.name }),
  //     ...(dto.sku !== undefined && { sku: dto.sku }),
  //     ...(dto.price !== undefined && { price: dto.price }),
  //     ...(dto.stock !== undefined && { stock: dto.stock }),
  //     ...(dto.image !== undefined && { imageUrl: dto.image }),
  //     ...(dto.attributes !== undefined && { attributes: dto.attributes }),
  //   });

  //   return this.findOne(productId);
  // }

  // async removeVariant(productId: string, variantId: string) {
  //   const variant = await this.variantsRepo.findOne({
  //     where: { id: variantId, productId },
  //   });
  //   if (!variant) throw new NotFoundException('Variant not found');

  //   await this.variantsRepo.delete(variantId);

  //   const remaining = await this.variantsRepo.count({ where: { productId } });
  //   if (remaining === 0) {
  //     await this.productsRepo.update(productId, { hasVariants: false });
  //   }

  //   return this.findOne(productId);
  // }

  // ─── Status shortcuts ───────────────────────────────────────────────────

  async publish(id: string) {
    await this.ensureExists(id);
    await this.productsRepo.update(id, { status: ProductStatus.PUBLISHED });
    return { message: 'Product published successfully' };
  }

  async moveToTrash(id: string) {
    await this.ensureExists(id);
    await this.productsRepo.update(id, { status: ProductStatus.TRASH });
    return { message: 'Product moved to trash' };
  }

  async restore(id: string) {
    await this.ensureExists(id);
    await this.productsRepo.update(id, { status: ProductStatus.DRAFT });
    return { message: 'Product restored to draft' };
  }

  /** Hard delete — only for items already in the trash. */
  async permanentlyRemove(id: string) {
    const product = await this.productsRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.status !== ProductStatus.TRASH) {
      throw new BadRequestException(
        'Move the product to trash before permanently deleting it',
      );
    }
    await this.productsRepo.delete(id);
    return { message: 'Product permanently deleted' };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private async ensureExists(id: string) {
    const exists = await this.productsRepo.findOne({ where: { id } });
    if (!exists) throw new NotFoundException('Product not found');
  }

  private async assertSkuUnique(sku: string, excludeId?: string) {
    const qb = this.productsRepo
      .createQueryBuilder('product')
      .where('product.sku = :sku', { sku });
    if (excludeId) qb.andWhere('product.id != :excludeId', { excludeId });
    if (await qb.getOne())
      throw new ConflictException('A product with this SKU already exists');
  }

  private async assertVariantSkuUnique(sku: string, excludeId?: string) {
    const qb = this.variantsRepo
      .createQueryBuilder('variant')
      .where('variant.sku = :sku', { sku });
    if (excludeId) qb.andWhere('variant.id != :excludeId', { excludeId });
    if (await qb.getOne())
      throw new ConflictException('A variant with this SKU already exists');
  }

  private assertUniqueSkusWithinBatch(skus: string[]) {
    const seen = new Set<string>();
    for (const sku of skus) {
      if (seen.has(sku))
        throw new BadRequestException(
          `Duplicate variant SKU in request: ${sku}`,
        );
      seen.add(sku);
    }
  }

  private async buildUniqueSlug(
    source: string,
    excludeId?: string,
  ): Promise<string> {
    const base = slugify(source);
    if (!base)
      throw new BadRequestException(
        'Could not generate a valid slug from the given name',
      );

    let candidate = base;
    let suffix = 2;
    while (true) {
      const qb = this.productsRepo
        .createQueryBuilder('product')
        .where('product.slug = :slug', { slug: candidate });
      if (excludeId) qb.andWhere('product.id != :excludeId', { excludeId });
      if (!(await qb.getOne())) return candidate;
      candidate = `${base}-${suffix++}`;
    }
  }

  private computeStockStatus(product: Product): StockStatus {
    if (!product.trackInventory) return StockStatus.IN_STOCK;
    if (product.quantity <= 0) return StockStatus.OUT_OF_STOCK;
    if (product.quantity <= product.lowStockThreshold)
      return StockStatus.LOW_STOCK;
    return StockStatus.IN_STOCK;
  }

  private stockStatusLabel(
    key: 'in_stock' | 'low_stock' | 'out_of_stock',
  ): StockStatus {
    return {
      in_stock: StockStatus.IN_STOCK,
      low_stock: StockStatus.LOW_STOCK,
      out_of_stock: StockStatus.OUT_OF_STOCK,
    }[key];
  }

  private statusLabel(status: ProductStatus): 'Published' | 'Draft' | 'Trash' {
    return { published: 'Published', draft: 'Draft', trash: 'Trash' }[
      status
    ] as any;
  }

  private mapToListResponse(product: Product) {
    const primaryImage = product.images?.[0];
    return {
      id: product.id,
      name: product.name,
      // sku: product.sku,
      image: primaryImage?.imageUrl ?? '',
      category: (product as any).category?.name ?? '',
      price: Number(product.price),
      originalPrice:
        product.comparePrice != null ? Number(product.comparePrice) : undefined,
      stock: product.quantity,
      stockStatus: this.computeStockStatus(product),
      status: this.statusLabel(product.status),
      createdAt: product.createdAt.toISOString(),
      hasVariants: product.hasVariants,
    };
  }

  private mapToDetailResponse(product: Product) {
    const primary =
      product.images?.find((i) => i.isPrimary) ?? product.images?.[0];
    return {
      ...this.mapToListResponse({
        ...product,
        images: primary ? [primary] : [],
      } as Product),
      // slug: product.slug,
      // brand: product.brand,
      shortDescription: product.shortDescription,
      fullDescription: product.fullDescription,
      comparePrice:
        product.comparePrice != null ? Number(product.comparePrice) : null,
      trackInventory: product.trackInventory,
      lowStockThreshold: product.lowStockThreshold,
      allowBackorders: product.allowBackorders,
      hasVariants: product.hasVariants,
      variantAttributes:
        product.variantAttributes?.map((a) => ({
          id: a.id,
          name: a.name,
          values: a.values,
        })) ?? [],
      variants:
        product.variants?.map((v) => ({
          id: v.id,
          image: v.imageUrl ?? '',
          name: v.name,
          attributes: Object.entries(v.attributes)
            .map(([k, val]) => `${k}: ${val}`)
            .join(', '),
          price: Number(v.price),
          stock: v.stock,
          // sku: v.sku,
        })) ?? [],
      images: product.images?.map((i) => i.imageUrl) ?? [],
      // weight: product.weight,
      // length: product.length,
      // width: product.width,
      // height: product.height,
      shippingClass: product.shippingClass,
      freeShipping: product.freeShipping,
      // metaTitle: product.metaTitle,
      // metaDescription: product.metaDescription,
    };
  }
}
