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
      where: { ativo: true },
      order: { nome: 'ASC' },
    });
  }

  async findById(id: string): Promise<ProductEntity | null> {
    return this.repo.findOne({
      where: { id, ativo: true },
    });
  }

  async findByName(name: string): Promise<ProductEntity | null> {
    return this.repo.findOne({
      where: { nome: name, ativo: true },
    });
  }

  /**
   * Search products by name
   */
  async searchByName(name: string): Promise<ProductEntity[] | null> {
    return this.repo
      .createQueryBuilder('prod')
      .where('prod.ativo = :ativo', { ativo: true })
      .andWhere('UPPER(prod.nome) ILIKE UPPER(:name)', {
        name: `%${name}%`,
      })
      .orderBy('prod.nome', 'ASC')
      .getMany();
  }

  /**
   * Get products with price statistics
   */
  async getProductsWithStats(): Promise<ProductEntity[] | null> {
    return this.repo
      .createQueryBuilder('prod')
      .leftJoin('prod.historicoPrecos', 'hp')
      .select([
        'prod.id',
        'prod.nome',
        'prod.categoria',
        'COUNT(hp.id) as total_prices',
        'AVG(hp.preco_venda) as preco_medio',
        'MIN(hp.preco_venda) as preco_minimo',
        'MAX(hp.preco_venda) as preco_maximo',
      ])
      .where('prod.ativo = :ativo', { ativo: true })
      .andWhere('hp.ativo = :ativo', { ativo: true })
      .groupBy('prod.id, prod.nome, prod.categoria')
      .orderBy('prod.nome', 'ASC')
      .getRawMany();
  }

  /**
   * Count total active products
   */
  async count(): Promise<number> {
    return this.repo.count({
      where: { ativo: true },
    });
  }
}
