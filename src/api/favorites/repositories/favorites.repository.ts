import { Injectable } from '@nestjs/common';
import { UserFavoriteStationEntity } from '@/database/entity/user-favorite-station.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class FavoritesRepository {
  constructor(
    @InjectRepository(UserFavoriteStationEntity)
    private readonly repo: Repository<UserFavoriteStationEntity>,
  ) {}

  /**
   * Encontra todos os favoritos de um usuário, incluindo posto e produto.
   * @param userId - O ID do usuário.
   * @returns Uma lista de entidades de favoritos.
   */
  async findAllByUserId(userId: string): Promise<UserFavoriteStationEntity[]> {
    return this.repo.find({
      where: { userId },
      relations: ['station', 'station.localization', 'product'],
    });
  }

  /**
   * Verifica se uma relação de favorito já existe.
   * @param userId - O ID do usuário.
   * @param stationId - O ID do posto.
   * @param productId - O ID do produto.
   */
  async findOne(
    userId: string,
    stationId: string,
    productId: string,
  ): Promise<UserFavoriteStationEntity | null> {
    return this.repo.findOne({ where: { userId, stationId, productId } });
  }

  /**
   * Adiciona um novo favorito (posto + produto) para um usuário.
   * @param userId - O ID do usuário.
   * @param stationId - O ID do posto.
   * @param productId - O ID do produto.
   */
  async store(
    userId: string,
    stationId: string,
    productId: string,
  ): Promise<UserFavoriteStationEntity> {
    const newFavorite = this.repo.create({ userId, stationId, productId });
    return this.repo.save(newFavorite);
  }

  /**
   * Remove um favorito de um usuário.
   * @param userId - O ID do usuário.
   * @param stationId - O ID do posto.
   * @param productId - O ID do produto.
   */
  async destroy(
    userId: string,
    stationId: string,
    productId: string,
  ): Promise<boolean> {
    const result = await this.repo.delete({ userId, stationId, productId });
    return (result.affected ?? 0) > 0;
  }
}
