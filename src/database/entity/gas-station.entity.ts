import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { LocalizationEntity } from './localization.entity';

import { PriceHistoryEntity } from './price-history.entity';
import { UserFavoriteStationEntity } from './user-favorite-station.entity';

@Entity('gas_station')
@Index(['tax_id'], { unique: true })
export class GasStationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  legal_name: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  trade_name?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand?: string | null;

  @Column({ type: 'varchar', length: 50,unique: true })
  tax_id: string; // Formato: 12.345.678/0001-90

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(
    () => LocalizationEntity,
    (localization) => localization.gas_station,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'localization_id' })
  localization: LocalizationEntity;

  @Column({ type: 'uuid', nullable: false })
  localization_id: string;

  @OneToMany(
    () => PriceHistoryEntity,
    (priceHistory) => priceHistory.gas_station,
  )
  price_history: PriceHistoryEntity[];

  @OneToMany(() => UserFavoriteStationEntity, (favorite) => favorite.station)
  favorited_by?: UserFavoriteStationEntity[];

  getDisplayName(): string {
    if (this.trade_name && this.trade_name !== this.legal_name) {
      return `${this.trade_name} (${this.legal_name})`;
    }
    return this.legal_name;
  }





  
}
