import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  type Point,
} from 'typeorm';
import { GasStationEntity } from './gas-station.entity';

@Entity('localization')
@Index(['state', 'city'])
@Index(['zipCode'])

@Index(['state', 'city', 'address'])
export class LocalizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  state: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  city: string;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'varchar', length: 25, nullable: true })
  number?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  complement?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  neighborhood?: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  zipCode?: string | null;

  // Nova coluna para PostGIS
    @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326, // Padrão para coordenadas geográficas (WGS 84)
    nullable: true,
  })
  coordinates: Point;
  
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => GasStationEntity, (gasStation) => gasStation.localization)
  gas_station: GasStationEntity[];

  // Métodos de negócio
  getLocationKey(): string {
    const parts = [
      this.state?.trim().toUpperCase(),
      this.city?.trim().toUpperCase(),
      this.address?.trim().toUpperCase(),
      this.number?.trim(),
      this.neighborhood?.trim().toUpperCase(),
      this.normalizeCep(),
    ].filter((part) => part && part.length > 0);

    return parts.join('|');
  }

  

  getFullAddress(): string {
    const parts = [
      this.address,
      this.number,
      this.complement,
      this.neighborhood,
      this.city,
      this.state,
      this.zipCode,
    ].filter(Boolean);

    return parts.join(', ');
  }

  private normalizeCep(): string {
    return this.zipCode?.replace(/[^\d]/g, '') || '';
  }

}
