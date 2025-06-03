import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { getErrorResponse } from '@/common/utils/lib';
import { ProductRepository } from './repositories/product.repository';
import { responseNotFound, responseOk } from '@/common/utils/response-api';
import { seconds } from '@nestjs/throttler';
@Injectable()
export class ProductService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly cacheService: CacheRequestService,
    private readonly repo: ProductRepository,
  ) {}

  async getProduct() {
    try {
      const cacheKey = this.cacheService.getCacheKey();
      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        return responseOk({ data: cachedData });
      }
      const data = await this.repo.getProductsWithStats();
      if (!data) {
        return responseNotFound({
          message: 'Nenhum produto encontrado',
        });
      }
      await this.cacheManager.set(cacheKey, data, seconds(1));
      return responseOk({ data });
    } catch (e) {
      return getErrorResponse(e);
    }
  }

   async findAll() {
    try {
      const cacheKey = this.cacheService.getCacheKey();
      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        return responseOk({ data: cachedData });
      }
      const data = await this.repo.findAll();
      if (!data) {
        return responseNotFound({
          message: 'Nenhum produto encontrado',
        });
      }
      await this.cacheManager.set(cacheKey, data, seconds(1));
      return responseOk({ data });
    } catch (e) {
      return getErrorResponse(e);
    }
  }

  async findById(id: string) {
    try {
      const cacheKey = this.cacheService.getCacheKey();
      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        return responseOk({ data: cachedData });
      }
      const data = await this.repo.findById(id);
      if (!data) {
        return responseNotFound({
          message: 'Nenhum produto encontrado',
        });
      }
      await this.cacheManager.set(cacheKey, data, seconds(1));
      return responseOk({ data });
    } catch (e) {
      return getErrorResponse(e);
    }
  }
}
