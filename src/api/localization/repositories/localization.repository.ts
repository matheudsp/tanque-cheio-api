import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository, type Point } from 'typeorm';
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

  async findAll(
    query: LocalizationQuerySchema,
  ) {
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

  async findById(id: string){
    return this.repo.findOneBy({ id });
  }

   async update(id: string, data: LocalizationCreateSchema) {
    const { coordinates, ...rest_of_data } = data;


    const new_coords: Point = {
      type: 'Point',
      coordinates: [
        coordinates.coordinates[1],
        coordinates.coordinates[0],
      ],
    };

    const payload_to_update = {
      ...rest_of_data,
      coordinates: new_coords,
    };
    
    return this.repo.update(id, payload_to_update);
  }
}
