import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { seconds } from '@nestjs/throttler';
import {
  ResponseApi,
  responseOk,
  responseNotFound,
  responseInternalServerError,
  responseConflict,
  responseCreated,
  responseBadRequest,
} from '@/common/utils/response-api';
import { zodErrorParse } from '@/common/utils/lib';
import { FavoritesRepository } from './repositories/favorites.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { GasStationEntity } from '@/database/entity/gas-station.entity';
import { ProductEntity } from '@/database/entity/product.entity';
import { Repository } from 'typeorm';
import {
  favoriteCreateSchema,
  FavoriteCreateSchema,
} from './schemas/favorites.schema';
import { PriceHistoryRepository } from '../price-history/repositories/price-history.repository';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(GasStationEntity)
    private readonly stationRepo: Repository<GasStationEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    private readonly favoritesRepo: FavoritesRepository,
    private readonly priceHistoryRepo: PriceHistoryRepository,
  ) {}

  private getCacheKey(userId: string): string {
    return `favorites:${userId}`;
  }

  async getFavorites(userId: string): Promise<ResponseApi> {
    try {
      const cacheKey = this.getCacheKey(userId);
      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        return responseOk({ data: cachedData });
      }

      const favorites = await this.favoritesRepo.findAllByUserId(userId);
      const responseData = await Promise.all(
        favorites.map(async (fav) => {
          
          const priceInfoArr = await this.priceHistoryRepo.getLatestPrices(
            fav.station.id,
            fav.product.name,
          );
          const priceInfo = priceInfoArr?.[0];

          
          return {
            stationId: fav.station.id,
            stationName: fav.station.getDisplayName(),
            localization: fav.station.localization,
            favoritedAt: fav.favoritedAt,
            product: {
              productId: fav.product.id,
              productName: fav.product.name,
              price: priceInfo?.price ?? null,
              unit: priceInfo?.unit ? `R$ / ${priceInfo.unit}` : null,
              lastUpdated: priceInfo?.lastUpdated ?? null,
              percentageChange: priceInfo?.percentageChange ?? null,
              trend: priceInfo?.trend ?? null,
            },
          };
        }),
      );

      await this.cacheManager.set(cacheKey, responseData, seconds(60));

      return responseOk({ data: responseData });
    } catch (e) {
      this.logger.error(`Error in getFavorites: ${e.message}`, e.stack);
      return responseInternalServerError();
    }
  }

  async addFavorite(
    userId: string,
    data: FavoriteCreateSchema,
  ): Promise<ResponseApi> {
    try {
      const { stationId, productId } = favoriteCreateSchema.parse(data);

      const [station, product, alreadyExists] = await Promise.all([
        this.stationRepo.findOneBy({ id: stationId }),
        this.productRepo.findOneBy({ id: productId }),
        this.favoritesRepo.findOne(userId, stationId, productId),
      ]);

      if (!station) {
        return responseNotFound({ message: 'Gas station not found' });
      }
      if (!product) {
        return responseNotFound({ message: 'Product not found' });
      }
      if (alreadyExists) {
        return responseConflict({
          message: 'This station/product combination is already a favorite',
        });
      }

      await this.favoritesRepo.store(userId, stationId, productId);

      await this.cacheManager.del(this.getCacheKey(userId));

      return responseCreated({ message: 'Favorite added successfully' });
    } catch (e) {
      const zodErr = zodErrorParse(e);
      if (zodErr.isError) return responseBadRequest({ error: zodErr.errors });

      this.logger.error(`Error in addFavorite: ${e.message}`, e.stack);
      return responseInternalServerError();
    }
  }

  async removeFavorite(
    userId: string,
    stationId: string,
    productId: string,
  ): Promise<ResponseApi> {
    try {
      const wasRemoved = await this.favoritesRepo.destroy(
        userId,
        stationId,
        productId,
      );

      if (!wasRemoved) {
        return responseNotFound({ message: 'Favorite not found' });
      }

      await this.cacheManager.del(this.getCacheKey(userId));

      return responseOk({ message: 'Favorite removed successfully' });
    } catch (e) {
      this.logger.error(`Error in removeFavorite: ${e.message}`, e.stack);
      return responseInternalServerError();
    }
  }
}
