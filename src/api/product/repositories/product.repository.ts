import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '@/database/entity/product.entity';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repo: Repository<ProductEntity>,
  ) {}

  async findAll(): Promise<ProductEntity[] | null> {
    return this.repo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<ProductEntity | null> {
    return this.repo.findOne({
      where: { id, isActive: true },
    });
  }

  async findByName(name: string): Promise<ProductEntity | null> {
    return this.repo.findOne({
      where: { name: name, isActive: true },
    });
  }

  /**
   * Search products by name
   */
  async searchByName(name: string): Promise<ProductEntity[] | null> {
    return this.repo
      .createQueryBuilder('prod')
      .where('prod.isActive = :isActive', { isActive: true })
      .andWhere('UPPER(prod.name) ILIKE UPPER(:name)', {
        name: `%${name}%`,
      })
      .orderBy('prod.name', 'ASC')
      .getMany();
  }

  /**
   * Get products with price statistics
   */
  async getProductsWithStats(): Promise<ProductEntity[] | null> {
    return this.repo
      .createQueryBuilder('prod')
      .leftJoin('prod.priceHistory', 'hp')
      .select([
        'prod.id',
        'prod.name',
        'prod.category',
        'COUNT(hp.id) as total_prices',
        'AVG(hp.price) as medium_price',
        'MIN(hp.price) as min_price',
        'MAX(hp.price) as max_price',
      ])
      .where('prod.isActive = :isActive', { isActive: true })
      .andWhere('hp.isActive = :isActive', { isActive: true })
      .groupBy('prod.id, prod.name, prod.category')
      .orderBy('prod.name', 'ASC')
      .getRawMany();
  }

  /**
   * Count total active products
   */
  async count(): Promise<number> {
    return this.repo.count({
      where: { isActive: true },
    });
  }
}
