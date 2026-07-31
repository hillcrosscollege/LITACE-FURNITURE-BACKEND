// categories/dto/query-category.dto.ts
import { IsOptional, IsString, IsBoolean, IsUUID, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCategoryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @IsUUID()
  parentId?: string;

  // "root" = top-level categories only (parentId IS NULL)
  @IsOptional()
  @IsIn(['root'])
  scope?: 'root';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  showInMenu?: boolean;
}
