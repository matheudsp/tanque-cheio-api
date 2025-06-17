// api/favorites/favorites.service.ts
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
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { FavoritesRepository } from './repositories/favorites.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { GasStationEntity } from '@/database/entity/gas-station.entity';
import { Repository } from 'typeorm';
import { favoriteCreateSchema } from './schemas/favorites.schema';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(GasStationEntity) private readonly stationRepo: Repository<GasStationEntity>,
    private readonly cacheRequest: CacheRequestService,
    private readonly favoritesRepo: FavoritesRepository,
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
      await this.cacheManager.set(cacheKey, favorites, seconds(60)); // Cache por 1 minuto

      return responseOk({ data: favorites });
    } catch (e) {
      this.logger.error(`Error in getFavorites: ${e.message}`);
      return responseInternalServerError();
    }
  }

  async addFavorite(userId: string, data: { stationId: string }): Promise<ResponseApi> {
    try {
      const parsed = favoriteCreateSchema.parse(data);
      const { stationId } = parsed;
      
      const [station, alreadyExists] = await Promise.all([
        this.stationRepo.findOneBy({ id: stationId }),
        this.favoritesRepo.findOne(userId, stationId),
      ]);

      if (!station) {
        return responseNotFound({ message: 'Gas station not found' });
      }
      if (alreadyExists) {
        return responseConflict({ message: 'Station is already a favorite' });
      }

      await this.favoritesRepo.store(userId, stationId);
      
      // Invalida o cache para que a próxima busca reflita a adição
      await this.cacheManager.del(this.getCacheKey(userId));

      return responseCreated({ message: 'Station added to favorites' });
    } catch (e) {
      const zodErr = zodErrorParse(e);
      if (zodErr.isError) return responseBadRequest({ error: zodErr.errors });

      this.logger.error(`Error in addFavorite: ${e.message}`);
      return responseInternalServerError();
    }
  }

  async removeFavorite(userId: string, stationId: string): Promise<ResponseApi> {
    try {
      const wasRemoved = await this.favoritesRepo.destroy(userId, stationId);

      if (!wasRemoved) {
        return responseNotFound({ message: 'Favorite not found' });
      }

      await this.cacheManager.del(this.getCacheKey(userId));

      return responseOk({ message: 'Station removed from favorites' });
    } catch (e) {
      this.logger.error(`Error in removeFavorite: ${e.message}`);
      return responseInternalServerError();
    }
  }
}