import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '@/database/entity/product.entity';


export interface ProductStats {
  id: string;
  name: string;
  category: string;
  total_prices: number;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
}

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repo: Repository<ProductEntity>,
  ) {}

  async findAll(): Promise<ProductEntity[]> {
    return this.repo.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<ProductEntity | null> {
    return this.repo.findOne({
      where: { id, is_active: true },
    });
  }

  /**
   * Busca produtos com estatísticas de preço agregadas
   */
  async getProductsWithStats(): Promise<ProductStats[]> {
    return this.repo
      .createQueryBuilder('product')
      .leftJoin('product.price_history', 'hp')
      .select([
        'product.id as id',
        'product.name as name',
        'product.category as category',
        // Padronizando os aliases para snake_case
        'COUNT(hp.id) as total_prices',
        'AVG(hp.price) as avg_price',
        'MIN(hp.price) as min_price',
        'MAX(hp.price) as max_price',
      ])
      .where('product.is_active = :is_active', { is_active: true })
      .andWhere('hp.is_active = :is_active', { is_active: true })
      .groupBy('product.id, product.name, product.category')
      .orderBy('product.name', 'ASC')
      .getRawMany<ProductStats>();
  }
}