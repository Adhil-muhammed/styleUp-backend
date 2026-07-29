import { Controller, Get, Param, Query, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards';
import { ShopsService } from '@/modules/shops/shops.service';
import {
  GetShopByIdQueryDto,
  GetShopCategoryVariantsQueryDto,
  GetShopPackageByIdQueryDto,
} from '@/modules/shops/dto';

interface ApiSuccess<T> {
  success: true;
  data: T;
}

@ApiTags('Mobile Shops')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: 'mobile/v1/shops', version: VERSION_NEUTRAL })
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get(':shopId')
  @ApiParam({ name: 'shopId', type: String })
  async getShopById(
    @Param('shopId') shopId: string,
    @Query() _query: GetShopByIdQueryDto,
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.shopsService.getShopById(shopId);
    return { success: true, data };
  }

  @Get(':shopId/packages/:packageId')
  @ApiParam({ name: 'shopId', type: String })
  @ApiParam({ name: 'packageId', type: String })
  async getShopPackageById(
    @Param('shopId') shopId: string,
    @Param('packageId') packageId: string,
    @Query() _query: GetShopPackageByIdQueryDto,
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.shopsService.getShopPackageById(shopId, packageId);
    return { success: true, data };
  }

  @Get(':shopId/categories/:categoryId/variants')
  @ApiParam({ name: 'shopId', type: String })
  @ApiParam({ name: 'categoryId', type: String })
  async getCategoryVariants(
    @Param('shopId') shopId: string,
    @Param('categoryId') categoryId: string,
    @Query() query: GetShopCategoryVariantsQueryDto,
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.shopsService.getCategoryVariants(shopId, categoryId, query.gender);
    return { success: true, data };
  }

  @Get(':shopId/specialists')
  @ApiParam({ name: 'shopId', type: String })
  async getSpecialists(@Param('shopId') shopId: string): Promise<ApiSuccess<unknown>> {
    const data = await this.shopsService.getSpecialists(shopId);
    return { success: true, data };
  }
}
