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
