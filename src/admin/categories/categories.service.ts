// categories/categories.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entity/category.entity';
import { CategoryStatus } from './enum/category.enum';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
    // TODO: inject Product repo once that module exists, to compute real
    // product counts in mapToResponse() below instead of hardcoding 0.
  ) {}

  // ─── Create ─────────────────────────────────────────────────────────────

  async create(dto: CreateCategoryDto) {
    const category = this.categoriesRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      status: dto.status ? CategoryStatus.ACTIVE : CategoryStatus.INACTIVE,
    });

    const saved = await this.categoriesRepo.save(category);
    return saved;
    // return this.findOne(saved.id);
  }

  // ─── List ───────────────────────────────────────────────────────────────

  async findAll(query: QueryCategoryDto) {
    const categories = await this.categoriesRepo.find();

    const [total, active, inactive] = await Promise.all([
      this.categoriesRepo.count(),

      this.categoriesRepo.count({
        where: { status: CategoryStatus.ACTIVE },
      }),

      this.categoriesRepo.count({
        where: { status: CategoryStatus.INACTIVE },
      }),
    ]);

    return {
      success: true,
      stats: {
        total,
        active,
        inactive,
      },
      categories,
    };
  }

  // ─── Get one ────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const category = await this.categoriesRepo.findOne({
      where: { id },
    });

    if (!category) throw new NotFoundException('Category not found');

    // const countMap = await this.getSubcategoryCounts([id]);
    return { success: true, data: category };
  }

  // ─── Update ─────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoriesRepo.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.name !== undefined) {
      category.name = dto.name;
    }

    if (dto.description !== undefined) {
      category.description = dto.description;
    }

    if (dto.status !== undefined) {
      category.status = dto.status
        ? CategoryStatus.ACTIVE
        : CategoryStatus.INACTIVE;
    }

    const updated = await this.categoriesRepo.save(category);

    return this.findOne(updated.id);
  }

  // ─── Delete ─────────────────────────────────────────────────────────────

  async delete(id: string) {
    const category = await this.categoriesRepo.delete({
      id,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return;
  }

  // ─── Update image ───────────────────────────────────────────────────────

  // async updateImage(id: string, imageUrl: string) {
  //   const category = await this.categoriesRepo.findOne({ where: { id } });
  //   if (!category) throw new NotFoundException('Category not found');

  //   await this.categoriesRepo.update(id, { imageUrl });
  //   return this.findOne(id);
  // }

  // ─── Reorder ────────────────────────────────────────────────────────────

  //   async reorder(dto: ReorderCategoriesDto) {
  //     await Promise.all(
  //       dto.items.map((item) =>
  //         this.categoriesRepo.update(item.id, { sortOrder: item.sortOrder }),
  //       ),
  //     );
  //     return { message: 'Category order updated successfully' };
  //   }

  // ─── Delete ─────────────────────────────────────────────────────────────

  // async remove(id: string) {
  //   const category = await this.categoriesRepo.findOne({ where: { id } });
  //   if (!category) throw new NotFoundException('Category not found');

  //   const childCount = await this.categoriesRepo.count({
  //     where: { parentId: id },
  //   });
  //   if (childCount > 0) {
  //     throw new BadRequestException(
  //       'Cannot delete a category that has subcategories. Reassign or delete them first.',
  //     );
  //   }

  //   // TODO: once Product module exists, block deletion (or require reassignment)
  //   // if any products still reference this category.

  //   await this.categoriesRepo.delete(id);
  //   return { message: 'Category deleted successfully' };
  // }

  // ─── Helpers ────────────────────────────────────────────────────────────
  private slugify(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric → hyphen
      .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
  }

  private async assertParentExists(parentId: string) {
    const exists = await this.categoriesRepo.findOne({
      where: { id: parentId },
    });
    if (!exists) throw new NotFoundException('Parent category not found');
  }

  /** Prevents A → B → A style parent cycles when reassigning a parent. */
  // private async assertNoCycle(categoryId: string, newParentId: string) {
  //   let currentId: string | null = newParentId;
  //   while (currentId) {
  //     if (currentId === categoryId) {
  //       throw new BadRequestException(
  //         'This would create a circular category hierarchy',
  //       );
  //     }
  //     const current: Pick<Category, 'parentId'> | null =
  //       await this.categoriesRepo.findOne({
  //         where: { id: currentId },
  //         //   select: ['parentId'],
  //         select: {
  //           parentId: true,
  //         },
  //       });
  //     currentId = current?.parentId ?? null;
  //   }
  // }

  private async buildUniqueSlug(
    source: string,
    excludeId?: string,
  ): Promise<string> {
    const base = this.slugify(source);
    if (!base)
      throw new BadRequestException(
        'Could not generate a valid slug from the given name',
      );

    let candidate = base;
    let suffix = 2;

    while (true) {
      const qb = this.categoriesRepo
        .createQueryBuilder('category')
        .where('category.slug = :slug', { slug: candidate });
      if (excludeId) qb.andWhere('category.id != :excludeId', { excludeId });

      const clash = await qb.getOne();
      if (!clash) return candidate;

      candidate = `${base}-${suffix++}`;
    }
  }

  private async getSubcategoryCounts(
    categoryIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (categoryIds.length === 0) return map;

    const rows: { parentId: string; count: string }[] =
      await this.categoriesRepo
        .createQueryBuilder('category')
        .select('category.parentId', 'parentId')
        .addSelect('COUNT(*)', 'count')
        .where('category.parentId IN (:...categoryIds)', { categoryIds })
        .groupBy('category.parentId')
        .getRawMany();

    for (const row of rows) {
      map.set(row.parentId, parseInt(row.count, 10));
    }
    return map;
  }

  private mapToResponse(category: Category, subcategoryCount: number) {
    return {
      id: category.id,
      name: category.name,
      // image: category.imageUrl ?? '',
      description: category.description ?? '',
      products: 0, // TODO: replace with real count once Product module exists
      status: category.status === CategoryStatus.ACTIVE ? 'Active' : 'Inactive',
      // sortOrder: category.sortOrder,
      createdAt: category.createdAt.toISOString(),
      // slug: category.slug,
      // parentCategory: category.parent?.name,
      // showInMenu: category.showInMenu,
      subcategories: subcategoryCount,
    };
  }
}
