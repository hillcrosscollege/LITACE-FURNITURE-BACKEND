// products/products.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { AdminJwtAuthGuard } from '../core/gaurds/admin_jwt_auth_gaurd';
import { CreateProductDto } from './dtos/create-product.dto';
import { CreateVariantDto, UpdateVariantDto } from './dtos/manage-variant.dto';
import { QueryProductDto } from './dtos/query-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { FilesInterceptor } from '@nestjs/platform-express';

@UseGuards(AdminJwtAuthGuard)
@Controller('admin/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('upload-images')
  @UseInterceptors(FilesInterceptor('images', 10))
  uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    return this.productsService.uploadImages(files);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images', 10))
  create(
    // @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string) {
    return this.productsService.publish(id);
  }

  @Patch(':id/trash')
  moveToTrash(@Param('id') id: string) {
    return this.productsService.moveToTrash(id);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.productsService.restore(id);
  }

  @Delete(':id')
  permanentlyRemove(@Param('id') id: string) {
    return this.productsService.permanentlyRemove(id);
  }

  // @Post(':id/variants')
  // addVariant(@Param('id') id: string, @Body() dto: CreateVariantDto) {
  //   return this.productsService.addVariant(id, dto);
  // }

  // @Patch(':id/variants/:variantId')
  // updateVariant(
  //   @Param('id') id: string,
  //   @Param('variantId') variantId: string,
  //   @Body() dto: UpdateVariantDto,
  // ) {
  //   return this.productsService.updateVariant(id, variantId, dto);
  // }

  // @Delete(':id/variants/:variantId')
  // removeVariant(
  //   @Param('id') id: string,
  //   @Param('variantId') variantId: string,
  // ) {
  //   return this.productsService.removeVariant(id, variantId);
  // }
}
