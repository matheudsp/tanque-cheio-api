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
  favoriteRemoveSchema,
  favoriteGetUserSchema,
  type FavoriteBulkSchema,
  favoriteBulkSchema,
} from './schemas/favorites.schema';
import { PriceHistoryRepository } from '../price-history/repositories/price-history.repository';
import type { FavoriteBulkDto } from './dtos/favorites.dto';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache_manager: Cache,
    @InjectRepository(GasStationEntity)
    private readonly station_repo: Repository<GasStationEntity>,
    @InjectRepository(ProductEntity)
    private readonly product_repo: Repository<ProductEntity>,
    private readonly favorites_repo: FavoritesRepository,
    private readonly price_history_repo: PriceHistoryRepository,
  ) {}

  private getCacheKey(user_id: string): string {
    return `favorites:${user_id}`;
  }

   /**
   * Busca os IDs dos produtos favoritados por um usuário para um posto específico.
   * @param user_id - O ID do usuário.
   * @param station_id - O ID do posto.
   * @returns Uma ResponseApi contendo um array de strings com os IDs dos produtos.
   */
  async getFavoritesByStation(
    user_id: string,
    station_id: string,
  ): Promise<ResponseApi> {
    try {
      // Aqui poderíamos usar Zod para validar os IDs se necessário
      const favorites =
        await this.favorites_repo.findFavoritedProductIdsByStation(
          user_id,
          station_id,
        );

      // Mapeia o resultado de [{ product_id: '...' }] para ['...']
      const productIds = favorites.map((fav) => fav.product_id);

      return responseOk({ data: productIds });
    } catch (error) {
      this.logger.error(
        `Error in getFavoritesByStation: ${error.message}`,
        error.stack,
      );
      return responseInternalServerError({ message: error.message });
    }
  }

  /**
   * Adiciona uma lista de produtos favoritos a um posto.
   */
  async addFavoritesInBulk(
    user_id: string,
    data: FavoriteBulkDto,
  ): Promise<ResponseApi> {
    try {
      favoriteBulkSchema.parse(data);
      const { station_id, product_ids } = data;

     
      await this.favorites_repo.storeBulk(user_id, station_id, product_ids);
      await this.cache_manager.del(this.getCacheKey(user_id));

      return responseCreated({ message: 'Favoritos adicionados com sucesso.' });
    } catch (error) {
      const zod_err = zodErrorParse(error);
      if (zod_err.isError) return responseBadRequest({ error: zod_err.errors });

      // Tratamento para violação de chave primária (favorito já existe)
      if (error.code === '23505') {
        return responseBadRequest({
          message: 'Um ou mais favoritos já existem.',
        });
      }

      this.logger.error(
        `Erro em addFavoritesInBulk: ${error.message}`,
        error.stack,
      );
      return responseInternalServerError({ message: error.message });
    }
  }
  /**
   * Remove uma lista de produtos favoritos de um posto.
   */
  async removeFavoritesInBulk(
    user_id: string,
    data: FavoriteBulkDto,
  ): Promise<ResponseApi> {
    try {
      favoriteBulkSchema.parse(data);
      const { station_id, product_ids } = data;

      await this.favorites_repo.destroyBulk(user_id, station_id, product_ids);
      await this.cache_manager.del(this.getCacheKey(user_id));

      return responseOk({ message: 'Favoritos removidos com sucesso.' });
    } catch (error) {
      const zod_err = zodErrorParse(error);
      if (zod_err.isError) return responseBadRequest({ error: zod_err.errors });

      this.logger.error(
        `Erro em removeFavoritesInBulk: ${error.message}`,
        error.stack,
      );
      return responseInternalServerError({ message: error.message });
    }
  }

  async getFavorites(user_id: string): Promise<ResponseApi> {
    try {
      favoriteGetUserSchema.parse({ user_id });

      const cache_key = this.getCacheKey(user_id);
      // const cachedData = await this.cache_manager.get<any[]>(cache_key);
      const cachedData = null;
      if (cachedData) {
        return responseOk({ data: cachedData });
      }

      const favorites = await this.favorites_repo.findAllByUserId(user_id);
      if (!favorites.length) {
        return responseOk({ data: [] });
      }

      const data = await Promise.all(
        favorites.map(async (fav) => {
          const priceInfoArr = await this.price_history_repo.getLatestPrices(
            fav.station.id,
            fav.product.name,
          );
          const priceInfo = priceInfoArr?.[0];

          return {
            gas_station_id: fav.station.id,
            gas_station_name: fav.station.getDisplayName(),
            gas_station_brand: fav.station.brand,
            localization: fav.station.localization,
            favorited_at: fav.favorited_at,
            product: {
              product_id: fav.product.id,
              product_name: fav.product.name,
              price: priceInfo?.price,
              unit_of_measure: priceInfo?.unit_of_measure,
              collection_date: priceInfo?.collection_date,
              percentage_change: priceInfo?.percentage_change ?? null,
              trend: priceInfo?.trend ?? null,
            },
          };
        }),
      );

      await this.cache_manager.set(cache_key, data, seconds(60));
      return responseOk({ data });
    } catch (error) {
      const zod_err = zodErrorParse(error);
      if (zod_err.isError) return responseBadRequest({ error: zod_err.errors });

      this.logger.error(`Error in getFavorites: ${error.message}`, error.stack);
      return responseInternalServerError({ message: error.message });
    }
  }

  async addFavorite(
    user_id: string,
    data: FavoriteCreateSchema,
  ): Promise<ResponseApi> {
    try {
      const parsed_data = favoriteCreateSchema.parse(data);
      const { station_id, product_id } = parsed_data;

      const [station, product, already_exists] = await Promise.all([
        this.station_repo.findOneBy({ id: station_id }),
        this.product_repo.findOneBy({ id: product_id }),
        this.favorites_repo.findOne(user_id, station_id, product_id),
      ]);

      if (!station)
        return responseNotFound({ message: 'Gas station not found' });
      if (!product) return responseNotFound({ message: 'Product not found' });
      if (already_exists)
        return responseConflict({ message: 'This favorite already exists' });

      await this.favorites_repo.store(user_id, station_id, product_id);
      await this.cache_manager.del(this.getCacheKey(user_id));

      return responseCreated({ message: 'Favorite added successfully' });
    } catch (error) {
      const zod_err = zodErrorParse(error);
      if (zod_err.isError) return responseBadRequest({ error: zod_err.errors });

      this.logger.error(`Error in addFavorite: ${error.message}`, error.stack);
      return responseInternalServerError({ message: error.message });
    }
  }

  async removeFavorite(
    user_id: string,
    station_id: string,
    product_id: string,
  ): Promise<ResponseApi> {
    try {
      favoriteRemoveSchema.parse({ station_id, product_id });

      const result = await this.favorites_repo.destroy(
        user_id,
        station_id,
        product_id,
      );

      if (result.affected === 0) {
        return responseNotFound({ message: 'Favorite not found' });
      }

      await this.cache_manager.del(this.getCacheKey(user_id));
      return responseOk({ message: 'Favorite removed successfully' });
    } catch (error) {
      const zod_err = zodErrorParse(error);
      if (zod_err.isError) return responseBadRequest({ error: zod_err.errors });

      this.logger.error(
        `Error in removeFavorite: ${error.message}`,
        error.stack,
      );
      return responseInternalServerError({ message: error.message });
    }
  }
}
