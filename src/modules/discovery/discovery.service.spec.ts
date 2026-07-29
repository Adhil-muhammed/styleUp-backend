import { Test } from '@nestjs/testing';
import {
  DISCOVERY_REPOSITORY,
  DiscoveryRepositoryPort,
} from '@/modules/discovery/ports/discovery.repository.port';
import { DiscoveryService } from './discovery.service';
import type {
  DiscoveryGeoPoint,
  HomeBanner,
  MapPin,
  PaginatedSalons,
  QuickBookService,
  PopularArtist,
  SalonCard,
  SalonSearchFilters,
  ServiceAreaCircle,
} from '@/shared/types';

type RepoMock = {
  [K in keyof DiscoveryRepositoryPort]: jest.Mock;
};

function createRepoMock(): RepoMock {
  return {
    findActiveCategories: jest.fn(),
    findActiveBanner: jest.fn(),
    findNearestSalons: jest.fn(),
    findPopularSalons: jest.fn(),
    findMapPins: jest.fn(),
    findServiceAreaCircles: jest.fn(),
    findQuickBookServices: jest.fn(),
    findQuickBookServicesNearby: jest.fn(),
    searchSalons: jest.fn(),
    findPopularArtists: jest.fn(),
    findCategoryById: jest.fn(),
    shopExists: jest.fn(),
  } as unknown as RepoMock;
}

describe('DiscoveryService', () => {
  const geo: DiscoveryGeoPoint = { lat: 10.0, lng: 76.0 };
  let repo: RepoMock;
  let service: DiscoveryService;

  beforeEach(async () => {
    repo = createRepoMock();

    const module = await Test.createTestingModule({
      providers: [DiscoveryService, { provide: DISCOVERY_REPOSITORY, useValue: repo }],
    }).compile();

    service = module.get(DiscoveryService);
  });

  it('getHome (geo = null) maps categories, promo, salons, userLocationLabel, and currency', async () => {
    const categories = [{ id: 'cat-1', name: 'Salons', iconUrl: null }];
    const promo: HomeBanner = {
      discountLabel: '10% OFF',
      subtitle: 'Book your next look',
      imageUri: 'https://img/promo.png',
      ctaLabel: 'Book now',
    };
    const nearestSalons: SalonCard[] = [
      {
        shopId: 'shop-1',
        name: 'Arjun Salon',
        address: 'Kochi, Kerala, India',
        rating: 4.5,
        imageUri: 'https://img/shop-1.png',
        distanceKm: null,
      },
    ];
    const popularSalons: SalonCard[] = [
      {
        shopId: 'shop-2',
        name: 'Meera Salon',
        address: 'Kozhikode, Kerala, India',
        rating: 4.8,
        imageUri: 'https://img/shop-2.png',
        distanceKm: null,
      },
    ];

    repo.findActiveCategories.mockResolvedValue(categories);
    repo.findActiveBanner.mockResolvedValue(promo);
    repo.findNearestSalons.mockResolvedValue(nearestSalons);
    repo.findPopularSalons.mockResolvedValue(popularSalons);

    const result = await service.getHome(null);

    expect(repo.findNearestSalons).toHaveBeenCalledWith(null, 10);
    expect(repo.findPopularSalons).toHaveBeenCalledWith(null, 10);

    expect(result.categories).toEqual([{ id: 'cat-1', label: 'Salons', imageUri: '' }]);
    expect(result.promo).toEqual(promo);
    expect(result.nearestSalons).toEqual(nearestSalons);
    expect(result.popularSalons).toEqual(popularSalons);
    expect(result.userLocationLabel).toBe('India');
    expect(result.currency).toBe('INR');
  });

  it('getDiscoverMap converts radiusKm to radiusMeters and returns pins + circles + currency', async () => {
    const radiusKm = 7;
    const pins: MapPin[] = [
      {
        id: 'shop-1',
        name: null,
        avatarUri: 'https://img/shop-1.png',
        label: null,
        priceCents: 500,
        variant: 'primary',
        latitude: 10.1,
        longitude: 76.1,
        size: 2,
      },
    ];
    const circles: ServiceAreaCircle[] = [
      { id: 'shop-1', latitude: 10.1, longitude: 76.1, radiusMeters: 5000 },
    ];

    repo.findMapPins.mockResolvedValue(pins);
    repo.findServiceAreaCircles.mockResolvedValue(circles);

    const result = await service.getDiscoverMap(geo, radiusKm);

    expect(repo.findMapPins).toHaveBeenCalledWith(geo, 7000);
    expect(repo.findServiceAreaCircles).toHaveBeenCalledWith(geo, 7000);
    expect(result.pins).toEqual(pins);
    expect(result.serviceAreaCircles).toEqual(circles);
    expect(result.currency).toBe('INR');
  });

  it('getQuickBookServices throws SHOP_NOT_FOUND when shopId does not exist', async () => {
    repo.shopExists.mockResolvedValue(false);

    await expect(service.getQuickBookServices(geo, 'shop-missing')).rejects.toMatchObject({
      status: 404,
      response: { code: 'SHOP_NOT_FOUND' },
    });

    expect(repo.shopExists).toHaveBeenCalledWith('shop-missing');
  });

  it('getQuickBookServices returns shop services when shopId exists', async () => {
    const services: QuickBookService[] = [
      {
        id: 'svc-1',
        title: 'Hair Cut',
        subtitle: '45 mins',
        badge: null,
        priceCents: 300,
        imageUri: null,
      },
    ];

    repo.shopExists.mockResolvedValue(true);
    repo.findQuickBookServices.mockResolvedValue(services);

    const result = await service.getQuickBookServices(geo, 'shop-1');

    expect(repo.findQuickBookServices).toHaveBeenCalledWith('shop-1');
    expect(result.services).toEqual(services);
    expect(result.currency).toBe('INR');
  });

  it('getQuickBookServices returns nearby services when shopId is omitted', async () => {
    const services: QuickBookService[] = [
      {
        id: 'svc-1',
        title: 'Hair Cut',
        subtitle: null,
        badge: 'Popular',
        priceCents: 300,
        imageUri: 'https://img/svc-1.png',
      },
    ];

    repo.findQuickBookServicesNearby.mockResolvedValue(services);

    const result = await service.getQuickBookServices(geo);

    expect(repo.findQuickBookServicesNearby).toHaveBeenCalledWith(geo);
    expect(result.services).toEqual(services);
    expect(result.currency).toBe('INR');
  });

  it('searchSalons returns paginated salons and currency', async () => {
    const paginated: PaginatedSalons = {
      data: [
        {
          shopId: 'shop-1',
          name: 'Arjun Salon',
          address: 'Kochi, Kerala, India',
          rating: 4.5,
          imageUri: 'https://img/shop-1.png',
          distanceKm: 2.5,
        },
      ],
      meta: {
        total: 10,
        page: 1,
        perPage: 20,
        totalPages: 1,
      },
    };

    repo.searchSalons.mockResolvedValue(paginated);

    const filters: SalonSearchFilters = {
      q: 'Arjun',
      geo,
      serviceIds: ['svc-1'],
      minRating: 3,
      gender: 'all',
      maxDistanceKm: 10,
      page: 1,
      perPage: 20,
    };

    const result = await service.searchSalons(filters);

    expect(repo.searchSalons).toHaveBeenCalledWith(filters);
    expect(result).toEqual({ ...paginated, currency: 'INR' });
  });

  it('getPopularArtists returns artists array', async () => {
    const artists: PopularArtist[] = [
      {
        id: 'staff-1',
        name: 'Rahul',
        role: 'Barber',
        imageUri: 'https://img/staff-1.png',
        shopId: 'shop-1',
      },
    ];

    repo.findPopularArtists.mockResolvedValue(artists);

    const result = await service.getPopularArtists(null, 5);

    expect(repo.findPopularArtists).toHaveBeenCalledWith(null, 5);
    expect(result).toEqual({ artists });
  });

  it('getCategorySalons throws CATEGORY_NOT_FOUND when category does not exist', async () => {
    repo.findCategoryById.mockResolvedValue(null);

    await expect(
      service.getCategorySalons('cat-missing', {
        geo: undefined,
        serviceIds: undefined,
        minRating: undefined,
        gender: undefined,
        maxDistanceKm: undefined,
        page: 1,
        perPage: 20,
      }),
    ).rejects.toMatchObject({
      status: 404,
      response: { code: 'CATEGORY_NOT_FOUND' },
    });
  });

  it('getCategorySalons returns category + paginated salons and currency', async () => {
    const category = { id: 'cat-1', name: 'Hair', iconUrl: null };

    const paginated: PaginatedSalons = {
      data: [
        {
          shopId: 'shop-1',
          name: 'Arjun Salon',
          address: 'Kochi, Kerala, India',
          rating: 4.5,
          imageUri: 'https://img/shop-1.png',
          distanceKm: null,
        },
      ],
      meta: {
        total: 1,
        page: 1,
        perPage: 20,
        totalPages: 1,
      },
    };

    repo.findCategoryById.mockResolvedValue(category);
    repo.searchSalons.mockResolvedValue(paginated);

    const result = await service.getCategorySalons('cat-1', {
      geo: undefined,
      serviceIds: undefined,
      minRating: 3,
      gender: 'man',
      maxDistanceKm: undefined,
      page: 1,
      perPage: 20,
    });

    expect(repo.searchSalons).toHaveBeenCalledWith({
      geo: undefined,
      serviceIds: undefined,
      minRating: 3,
      gender: 'man',
      maxDistanceKm: undefined,
      page: 1,
      perPage: 20,
      categoryId: 'cat-1',
    } satisfies SalonSearchFilters);

    expect(result.category).toEqual({
      id: 'cat-1',
      label: 'Hair',
      imageUri: '',
    });
    expect(result.data).toEqual(paginated.data);
    expect(result.meta).toEqual(paginated.meta);
    expect(result.currency).toBe('INR');
  });
});
