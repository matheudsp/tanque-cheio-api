import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocalizationEntity } from '@/database/entity/localization.entity';
import { LocalizationCreateSchema } from '../schemas/localization.schema';

@Injectable()
export class LocalizationRepository {
  constructor(
    @InjectRepository(LocalizationEntity)
    private readonly repo: Repository<LocalizationEntity>,
  ) {}

  async update(id:string, data: LocalizationCreateSchema){
    return this.repo.update(id,{
      city: data.city,
      complement: data.complement,
      zipCode: data.zipCode,
      state:data.state,
      address: data.address,
      // geom: data.geom 
    })
  }

  async findAll(): Promise<LocalizationEntity[] | null> {
    return this.repo.find({
      order: { state: 'ASC', city: 'ASC' },
    });
  }

  async findById(id: string): Promise<LocalizationEntity | null> {
    return this.repo.findOne({
      where: { id },
    });
  }

  async findByState(state: string): Promise<LocalizationEntity[] | null> {
    return this.repo.find({
      where: { state: state.toUpperCase() },
      order: { city: 'ASC' },
    });
  }

  async findWithoutCoordinates(): Promise<LocalizationEntity[]> {
    return this.repo.find({
      // where: [{ latitude: undefined }, { longitude: undefined }],
      order: { state: 'ASC', city: 'ASC' },
    });
  }

  async updateCoordinates(
    id: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    await this.repo.update(id, {
      // latitude,
      // longitude,
    });
  }

  async bulkUpdateCoordinates(
    updates: Array<{ id: string; latitude: number; longitude: number }>,
  ): Promise<void> {
    if (updates.length === 0) return;

    // Usando transaction para garantir atomicidade
    await this.repo.manager.transaction(async (manager) => {
      for (const update of updates) {
        await manager.update(LocalizationEntity, update.id, {
          // latitude: update.latitude,
          // longitude: update.longitude,
        });
      }
    });
  }

  async countWithoutCoordinates(): Promise<number> {
    return this.repo.count({
      // where: [{ latitude: undefined }, { longitude: undefined }],
    });
  }

  async countWithCoordinates(): Promise<number> {
    return this.repo
      .createQueryBuilder('localization')
      .where('localization.latitude IS NOT NULL')
      .andWhere('localization.longitude IS NOT NULL')
      .getCount();
  }
}
