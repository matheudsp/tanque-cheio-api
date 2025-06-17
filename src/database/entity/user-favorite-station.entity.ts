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
  userId: string;

  @PrimaryColumn({ type: 'uuid' })
  stationId: string;

  // Adicionando o ID do produto à chave primária
  @PrimaryColumn({ type: 'uuid' })
  productId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  favoritedAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.favorites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => GasStationEntity, (station) => station.favorited_by, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'stationId' })
  station: GasStationEntity;

  @ManyToOne(() => ProductEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: ProductEntity;
}
