import { DiscoveryController } from './discovery.controller';
import type { DiscoveryService } from './discovery.service';
import type {
  GetCategorySalonsQueryDto,
  GetDiscoverMapQueryDto,
  GetHomeQueryDto,
  GetQuickBookServicesQueryDto,
  GetSearchSalonsQueryDto,
} from './dto';

describe('DiscoveryController', () => {
  const mockDiscoveryService = {
    getHome: jest.fn(),
    getDiscoverMap: jest.fn(),
    getQuickBookServices: jest.fn(),
    searchSalons: jest.fn(),
    getPopularArtists: jest.fn(),
    getCategorySalons: jest.fn(),
  };

  it('getDiscoverMap throws MISSING_GEO when lat is missing', async () => {
    const controller = new DiscoveryController(mockDiscoveryService as unknown as DiscoveryService);

    await expect(
      controller.getDiscoverMap({ lat: undefined, lng: 10 } as GetDiscoverMapQueryDto),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'MISSING_GEO' },
    });
  });

  it('getQuickBookServices throws MISSING_GEO when lng is missing', async () => {
    const controller = new DiscoveryController(mockDiscoveryService as unknown as DiscoveryService);

    await expect(
      controller.getQuickBookServices({ lat: 10, lng: undefined } as GetQuickBookServicesQueryDto),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'MISSING_GEO' },
    });
  });

  it('getHome returns success=true and calls service with geo=null when lat/lng are missing', async () => {
    const controller = new DiscoveryController(mockDiscoveryService as unknown as DiscoveryService);
    const query: GetHomeQueryDto = {};

    mockDiscoveryService.getHome.mockResolvedValue({
      categories: [],
      promo: null,
      nearestSalons: [],
      popularSalons: [],
      userLocationLabel: '',
      currency: 'INR',
    });

    const result = await controller.getHome(query);
    const data = result.data as { currency: string };

    expect(mockDiscoveryService.getHome).toHaveBeenCalledWith(null);
    expect(result.success).toBe(true);
    expect(data.currency).toBe('INR');
  });

  it('searchSalons passes defaults page=1 perPage=20 when missing', async () => {
    const controller = new DiscoveryController(mockDiscoveryService as unknown as DiscoveryService);

    const query: GetSearchSalonsQueryDto = {
      q: 'abc',
      // no lat/lng, page, perPage
      gender: 'all',
    };

    mockDiscoveryService.searchSalons.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, perPage: 20, totalPages: 0 },
      currency: 'INR',
    });

    await controller.searchSalons(query);

    expect(mockDiscoveryService.searchSalons).toHaveBeenCalledWith({
      q: 'abc',
      geo: undefined,
      serviceIds: undefined,
      minRating: undefined,
      gender: 'all',
      maxDistanceKm: undefined,
      page: 1,
      perPage: 20,
    });
  });

  it('getCategorySalons passes geo=undefined and page/perPage defaults', async () => {
    const controller = new DiscoveryController(mockDiscoveryService as unknown as DiscoveryService);

    const query: GetCategorySalonsQueryDto = {
      // no lat/lng, page, perPage
    };

    mockDiscoveryService.getCategorySalons.mockResolvedValue({
      category: { id: 'cat-1', label: 'Hair', imageUri: '' },
      data: [],
      meta: { total: 0, page: 1, perPage: 20, totalPages: 0 },
      currency: 'INR',
    });

    await controller.getCategorySalons('cat-1', query);

    expect(mockDiscoveryService.getCategorySalons).toHaveBeenCalledWith('cat-1', {
      geo: undefined,
      serviceIds: undefined,
      minRating: undefined,
      gender: undefined,
      maxDistanceKm: undefined,
      page: 1,
      perPage: 20,
    });
  });
});
