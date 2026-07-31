// products/dto/update-product.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

// Variants/attributes are managed via their own endpoints, not folded into a general update
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['variants', 'variantAttributes'] as const),
) {}
