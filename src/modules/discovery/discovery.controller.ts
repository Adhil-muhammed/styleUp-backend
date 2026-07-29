import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards';
import { DiscoveryService } from '@/modules/discovery/discovery.service';
import {
  GetCategorySalonsQueryDto,
  GetDiscoverMapQueryDto,
  GetHomeQueryDto,
  GetPopularArtistsQueryDto,
  GetQuickBookServicesQueryDto,
  GetSearchSalonsQueryDto,
} from '@/modules/discovery/dto';

interface ApiSuccess<T> {
  success: true;
  data: T;
}

@ApiTags('Mobile Discovery')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: 'mobile/v1', version: VERSION_NEUTRAL })
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('home')
  async getHome(@Query() query: GetHomeQueryDto): Promise<ApiSuccess<unknown>> {
    const geo =
      query.lat !== undefined && query.lng !== undefined
        ? { lat: query.lat, lng: query.lng }
        : null;
    const data = await this.discoveryService.getHome(geo);
    return { success: true, data };
  }

  @Get('discover/map')
  async getDiscoverMap(@Query() query: GetDiscoverMapQueryDto): Promise<ApiSuccess<unknown>> {
    if (query.lat === undefined || query.lng === undefined) {
      throw new BadRequestException({ code: 'MISSING_GEO', message: 'lat and lng are required' });
    }
    const data = await this.discoveryService.getDiscoverMap(
      { lat: query.lat, lng: query.lng },
      query.radiusKm,
    );
    return { success: true, data };
  }

  @Get('discover/quick-book/services')
  async getQuickBookServices(
    @Query() query: GetQuickBookServicesQueryDto,
  ): Promise<ApiSuccess<unknown>> {
    if (query.lat === undefined || query.lng === undefined) {
      throw new BadRequestException({ code: 'MISSING_GEO', message: 'lat and lng are required' });
    }
    const data = await this.discoveryService.getQuickBookServices(
      { lat: query.lat, lng: query.lng },
      query.shopId,
    );
    return { success: true, data };
  }

  @Get('search/salons')
  async searchSalons(@Query() query: GetSearchSalonsQueryDto): Promise<ApiSuccess<unknown>> {
    const geo =
      query.lat !== undefined && query.lng !== undefined
        ? { lat: query.lat, lng: query.lng }
        : undefined;

    const data = await this.discoveryService.searchSalons({
      q: query.q,
      geo,
      serviceIds: query.serviceIds,
      minRating: query.minRating,
      gender: query.gender,
      maxDistanceKm: query.maxDistanceKm,
      page: query.page ?? 1,
      perPage: query.perPage ?? 20,
    });
    return { success: true, data };
  }

  @Get('search/popular-artists')
  async getPopularArtists(@Query() query: GetPopularArtistsQueryDto): Promise<ApiSuccess<unknown>> {
    const geo =
      query.lat !== undefined && query.lng !== undefined
        ? { lat: query.lat, lng: query.lng }
        : null;
    const data = await this.discoveryService.getPopularArtists(geo, query.limit ?? 20);
    return { success: true, data };
  }

  @Get('categories/:categoryId/salons')
  @ApiParam({ name: 'categoryId', type: String })
  async getCategorySalons(
    @Param('categoryId') categoryId: string,
    @Query() query: GetCategorySalonsQueryDto,
  ): Promise<ApiSuccess<unknown>> {
    const geo =
      query.lat !== undefined && query.lng !== undefined
        ? { lat: query.lat, lng: query.lng }
        : undefined;

    const data = await this.discoveryService.getCategorySalons(categoryId, {
      geo,
      serviceIds: query.serviceIds,
      minRating: query.minRating,
      gender: query.gender,
      maxDistanceKm: query.maxDistanceKm,
      page: query.page ?? 1,
      perPage: query.perPage ?? 20,
    });
    return { success: true, data };
  }
}
