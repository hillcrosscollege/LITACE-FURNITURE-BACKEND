// categories/dto/create-category.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  // Empty string / omitted = top-level category
  // @IsOptional()
  // @IsUUID()
  // parentCategory?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // true = Active, false = Inactive — mapped to CategoryStatus in the service
  @IsBoolean()
  status: boolean;

  // @IsOptional()
  // @IsString()
  // @MaxLength(160)
  // metaTitle?: string;

  // @IsOptional()
  // @IsString()
  // metaDescription?: string;

  // @IsOptional()
  // @IsString()
  // metaKeywords?: string;

  // @IsOptional()
  // @IsString()
  // urlSlug?: string;

  // @IsOptional()
  // @IsBoolean()
  // showInMenu?: boolean;
}
