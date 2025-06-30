import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PushTokenEntity } from '@/database/entity/push_token.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PushNotificationsRepository {
  constructor(
    @InjectRepository(PushTokenEntity)
    private readonly repo: Repository<PushTokenEntity>,
  ) {}

  async findAll(): Promise<PushTokenEntity[]> {
    try {
      return await this.repo.find();
    } catch (error) {
      throw error;
    }
  }

  async upsertToken(userId: string, token: string): Promise<void> {
    try {
      await this.repo.upsert(
        {
          push_token: token,
          user_id: userId,
        },
        ['push_token'],
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Encontra todos os push tokens associados a um userId.
   * @param userId - O ID do usuário.
   * @returns Uma promessa que resolve para um array de PushTokenEntity.
   */
  async findByUserId(userId: string): Promise<PushTokenEntity[]> {
    try {
      return await this.repo.find({ where: { user_id: userId } });
    } catch (error) {
      throw error;
    }
  }

  async deleteByToken(pushToken: string): Promise<void> {
    try {
      await this.repo.delete({ push_token: pushToken });
    } catch (error) {
      throw error;
    }
  }
}
