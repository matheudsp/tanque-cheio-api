import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { HasRolesEntity } from './has-roles.entity';
import { UserFavoriteStationEntity } from './user-favorite-station.entity';
import { PushTokenEntity } from './push_token.entity';

@Entity('users')
export class UserEntity {
  @PrimaryColumn({ length: 36 })
  id: string;
  @Column()
  name: string;
  @Column({ unique: true })
  email: string;
  @Column()
  password: string;
  @CreateDateColumn({ type: 'timestamptz' })
  created_at?: Date;
  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at?: Date;
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at?: Date;

  @OneToMany(() => PushTokenEntity, (token) => token.user)
  push_tokens?: PushTokenEntity[];

  @OneToMany(() => HasRolesEntity, (hasRole) => hasRole.user)
  has_roles?: HasRolesEntity[];

  @OneToMany(() => UserFavoriteStationEntity, (favorite) => favorite.user)
  favorites?: UserFavoriteStationEntity[];
}
