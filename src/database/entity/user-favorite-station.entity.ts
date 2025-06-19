import {
  Entity,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { GasStationEntity } from './gas-station.entity';
import { ProductEntity } from './product.entity';

@Entity('user_favorite_stations')
export class UserFavoriteStationEntity {
  @PrimaryColumn({ type: 'uuid' })
  user_id: string;

  @PrimaryColumn({ type: 'uuid' })
  station_id: string;

  @PrimaryColumn({ type: 'uuid' })
  product_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  favorited_at: Date;

  @ManyToOne(() => UserEntity, (user) => user.favorites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => GasStationEntity, (station) => station.favorited_by, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'station_id' })
  station: GasStationEntity;

  @ManyToOne(() => ProductEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;
}
