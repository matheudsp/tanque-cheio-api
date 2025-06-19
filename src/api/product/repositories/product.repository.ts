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
   * Get products with price statistics
   */
  async getProductsWithStats(){
    return this.repo
      .createQueryBuilder('product')
      .leftJoin('product.priceHistory', 'hp')
      .select([
        'product.id',
        'product.name',
        'product.category',
        'COUNT(hp.id) as total_prices',
        'AVG(hp.price) as medium_price',
        'MIN(hp.price) as min_price',
        'MAX(hp.price) as max_price',
      ])
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('hp.isActive = :isActive', { isActive: true })
      .groupBy('product.id, product.name, product.category')
      .orderBy('product.name', 'ASC')
      .getRawMany();
  }

 
}
