import { Injectable } from '@nestjs/common';
import { UserFavoriteStationEntity } from '@/database/entity/user-favorite-station.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasStationEntity } from '@/database/entity/gas-station.entity';

@Injectable()
export class FavoritesRepository {
  constructor(
    @InjectRepository(UserFavoriteStationEntity)
    private readonly repo: Repository<UserFavoriteStationEntity>,
  ) {}

  /**
   * Encontra todos os postos favoritos de um usuário específico.
   * @param userId - O ID do usuário.
   * @returns Uma lista de entidades de GasStation.
   */
  async findAllByUserId(userId: string): Promise<GasStationEntity[]> {
    const favorites = await this.repo.find({
      where: { userId },

      relations: ['station', 'station.localization'],
    });

    return favorites.map((fav) => fav.station);
  }

  /**
   * Verifica se uma relação de favorito já existe.
   * @param userId - O ID do usuário.
   * @param stationId - O ID do posto.
   */
  async findOne(
    userId: string,
    stationId: string,
  ): Promise<UserFavoriteStationEntity | null> {
    return this.repo.findOne({ where: { userId, stationId } });
  }

  /**
   * Adiciona um novo posto aos favoritos de um usuário.
   * @param userId - O ID do usuário.
   * @param stationId - O ID do posto.
   */
  async store(
    userId: string,
    stationId: string,
  ): Promise<UserFavoriteStationEntity> {
    const newFavorite = this.repo.create({ userId, stationId });
    return this.repo.save(newFavorite);
  }

  /**
   * Remove um posto dos favoritos de um usuário.
   * @param userId - O ID do usuário.
   * @param stationId - O ID do posto.
   */
  async destroy(userId: string, stationId: string): Promise<boolean> {
    const result = await this.repo.delete({ userId, stationId });
    return !!result.affected && result.affected > 0;
  }
}
