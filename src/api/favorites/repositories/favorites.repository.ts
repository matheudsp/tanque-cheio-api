import { Injectable } from '@nestjs/common';
import { UserFavoriteStationEntity } from '@/database/entity/user-favorite-station.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, In, Repository } from 'typeorm';

@Injectable()
export class FavoritesRepository {
  constructor(
    @InjectRepository(UserFavoriteStationEntity)
    private readonly repo: Repository<UserFavoriteStationEntity>,
  ) {}

  /**
   * Busca todos os registros de favoritos com as entidades relacionadas para o CRON job.
   */
  async findAllWithRelations(): Promise<UserFavoriteStationEntity[]> {
    try {
      // Usamos 'relations' para carregar os dados do usuário, posto e produto.
      // Isso evita o problema de N+1 queries.
      return await this.repo.find({
        relations: ['user', 'station', 'product'],
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Encontra todos os IDs de produtos favoritados por um usuário para um posto específico.
   * @param user_id - O ID do usuário.
   * @param station_id - O ID do posto.
   * @returns Uma promessa que resolve para uma lista de entidades contendo apenas o product_id.
   * @example
   * // Retorna: [{ product_id: 'uuid-1' }, { product_id: 'uuid-2' }]
   */
  async findFavoritedProductIdsByStation(
    user_id: string,
    station_id: string,
  ): Promise<{ product_id: string }[]> {
    return this.repo.find({
      where: { user_id, station_id },
      select: ['product_id'], // Seleciona APENAS a coluna product_id para máxima eficiência
    });
  }

  /**
   * Encontra todos os favoritos de um usuário.
   */
  async findAllByUserId(user_id: string): Promise<UserFavoriteStationEntity[]> {
    return this.repo.find({
      where: { user_id },
      relations: ['station', 'station.localization', 'product'],
    });
  }

  /**
   * Verifica se um favorito já existe.
   */
  async findOne(
    user_id: string,
    station_id: string,
    product_id: string,
  ): Promise<UserFavoriteStationEntity | null> {
    return this.repo.findOne({ where: { user_id, station_id, product_id } });
  }

  /**
   * Adiciona favoritos em lote.
   */
  async storeBulk(
    user_id: string,
    station_id: string,
    product_ids: string[],
  ): Promise<UserFavoriteStationEntity[]> {
    const favorites = product_ids.map((product_id) =>
      this.repo.create({ user_id, station_id, product_id }),
    );
    return this.repo.save(favorites);
  }

  /**
   * Adiciona um novo favorito.
   */
  async store(
    user_id: string,
    station_id: string,
    product_id: string,
  ): Promise<UserFavoriteStationEntity> {
    const new_favorite = this.repo.create({ user_id, station_id, product_id });
    return this.repo.save(new_favorite);
  }

  /**
   * Remove em lote
   */

  async destroyBulk(
    user_id: string,
    station_id: string,
    product_ids: string[],
  ): Promise<DeleteResult> {
    return this.repo.delete({
      user_id,
      station_id,
      product_id: In(product_ids),
    });
  }

  /**
   * Remove um favorito e retorna o resultado da operação.
   */
  async destroy(
    user_id: string,
    station_id: string,
    product_id: string,
  ): Promise<DeleteResult> {
    return this.repo.delete({ user_id, station_id, product_id });
  }
}
