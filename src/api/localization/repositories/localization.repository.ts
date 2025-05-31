import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocalizationEntity } from '@/database/entity/localization.entity';

@Injectable()
export class LocalizationRepository {
  constructor(
    @InjectRepository(LocalizationEntity)
    private readonly repo: Repository<LocalizationEntity>,
  ) {}

  async findAll(): Promise<LocalizationEntity[] | null> {
    return this.repo.find({
      order: { uf: 'ASC', municipio: 'ASC' },
    });
  }

  async findById(id: string): Promise<LocalizationEntity | null> {
    return this.repo.findOne({
      where: { id },
    });
  }

  async findByUf(uf: string): Promise<LocalizationEntity[] | null> {
    return this.repo.find({
      where: { uf: uf.toUpperCase() },
      order: { municipio: 'ASC' },
    });
  }
}
