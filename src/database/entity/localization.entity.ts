import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GasStationEntity } from './gas-station.entity';
@Entity('localization')
@Index(['state', 'city'])
@Index(['zipCode'])
@Index(['state', 'city', 'address']) // Para busca otimizada
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
  zipCode?: string | null; // Formato: 12345-678

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  latitude?: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: number | null;

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

  isSimilarTo(other: LocalizationEntity): boolean {
    const normalize = (str?: string) => str?.trim().toUpperCase() || '';

    // Verifica se UF e município são iguais (obrigatório)
    if (
      normalize(this.state) !== normalize(other.state) ||
      normalize(this.city) !== normalize(other.city)
    ) {
      return false;
    }

    // Se ambos têm endereço, compara endereços
    if (this.address && other.address) {
      const enderecoSimilar =
        normalize(this.address) === normalize(other.address);
      const numeroSimilar =
        normalize(this.number!) === normalize(other.number!);
      const cepSimilar = this.normalizeCep() === other.normalizeCep();

      return enderecoSimilar && (numeroSimilar || cepSimilar);
    }

    // Se pelo menos um tem CEP, compara CEPs
    if (this.zipCode || other.zipCode) {
      return this.normalizeCep() === other.normalizeCep();
    }

    return false;
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

  static normalizeUf(uf: string): string {
    return uf?.trim().toUpperCase() || '';
  }

  static normalizeMunicipio(municipio: string): string {
    return municipio?.trim().toUpperCase() || '';
  }

  isValid(): boolean {
    return !!(this.state?.trim() && this.city?.trim());
  }
}
