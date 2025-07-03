import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ILike,
  IsNull,
  Not,
  Repository,
  type Point,
  type UpdateResult,
} from 'typeorm';
import { LocalizationEntity } from '@/database/entity/localization.entity';
import {
  LocalizationCreateSchema,
  LocalizationQuerySchema,
} from '../schemas/localization.schema';

@Injectable()
export class LocalizationRepository {
  constructor(
    @InjectRepository(LocalizationEntity)
    private readonly repo: Repository<LocalizationEntity>,
  ) {}

  /**
   * Finds all localizations that do not have coordinates yet.
   * @param limit The maximum number of records to return.
   * @returns A promise that resolves to an array of LocalizationEntity.
   */
  async findAllWithoutCoordinates(
    limit: number = 100,
  ): Promise<LocalizationEntity[]> {
    return this.repo.find({
      where: {
        coordinates: IsNull(),
        address: Not(IsNull()),
      },
      take: limit,
    });
  }
  async countAllWithoutCoordinates(): Promise<number> {
    return this.repo.count({
      where: {
        coordinates: IsNull(),
        address: Not(IsNull()),
      },
    });
  }

  async findAll(query: LocalizationQuerySchema) {
    const { page, limit, search } = query;
    const where_clauses = search
      ? [
          { city: ILike(`%${search}%`) },
          { state: ILike(`%${search}%`) },
          { address: ILike(`%${search}%`) },
        ]
      : {};

    return this.repo.findAndCount({
      where: where_clauses,
      take: limit,
      skip: (page - 1) * limit,
      order: { city: 'ASC' },
    });
  }

  async findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  async update(
    id: string,
    data: Partial<LocalizationEntity>,
  ): Promise<UpdateResult> {
    const payload: Partial<LocalizationEntity> = {};

    // Se vier coordinates, converte para Point
    if (data.coordinates) {
      const [lng, lat] = data.coordinates.coordinates;
      payload.coordinates = {
        type: 'Point',
        coordinates: [lng, lat],
      } as Point;
    }

    const { coordinates, ...rest } = data;
    Object.assign(payload, rest);

    return this.repo.update(id, payload);
  }
}
