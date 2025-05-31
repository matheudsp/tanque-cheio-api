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
@Entity('localizacao')
@Index(['uf', 'municipio'])
@Index(['cep'])
@Index(['uf', 'municipio', 'endereco']) // Para busca otimizada
export class LocalizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  uf: string; // Sempre 2 caracteres (SP, RJ, etc.)

  @Column({ type: 'varchar', length: 200, nullable: false })
  municipio: string;

  @Column({ type: 'text', nullable: true })
  endereco?: string | null;

  @Column({ type: 'varchar', length: 25, nullable: true })
  numero?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  complemento?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  bairro?: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  cep?: string | null; // Formato: 12345-678

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  latitude?: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: number | null;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;

  @OneToMany(() => GasStationEntity, (gasStation) => gasStation.localizacao)
  postos: GasStationEntity[];

  // Métodos de negócio
  getLocationKey(): string {
    const parts = [
      this.uf?.trim().toUpperCase(),
      this.municipio?.trim().toUpperCase(),
      this.endereco?.trim().toUpperCase(),
      this.numero?.trim(),
      this.bairro?.trim().toUpperCase(),
      this.normalizeCep()
    ].filter(part => part && part.length > 0);
    
    return parts.join('|');
  }

  isSimilarTo(other: LocalizationEntity): boolean {
    const normalize = (str?: string) => str?.trim().toUpperCase() || '';
    
    // Verifica se UF e município são iguais (obrigatório)
    if (normalize(this.uf) !== normalize(other.uf) || 
        normalize(this.municipio) !== normalize(other.municipio)) {
      return false;
    }

    // Se ambos têm endereço, compara endereços
    if (this.endereco && other.endereco) {
      const enderecoSimilar = normalize(this.endereco) === normalize(other.endereco);
      const numeroSimilar = normalize(this.numero!) === normalize(other.numero!);
      const cepSimilar = this.normalizeCep() === other.normalizeCep();
      
      return enderecoSimilar && (numeroSimilar || cepSimilar);
    }

    // Se pelo menos um tem CEP, compara CEPs
    if (this.cep || other.cep) {
      return this.normalizeCep() === other.normalizeCep();
    }

    return false;
  }

  getFullAddress(): string {
    const parts = [
      this.endereco,
      this.numero,
      this.complemento,
      this.bairro,
      this.municipio,
      this.uf,
      this.cep
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  private normalizeCep(): string {
    return this.cep?.replace(/[^\d]/g, '') || '';
  }

  formatCep(): string {
    const cleaned = this.normalizeCep();
    if (cleaned.length === 8) {
      return `${cleaned.substr(0, 5)}-${cleaned.substr(5)}`;
    }
    return cleaned;
  }

  static normalizeUf(uf: string): string {
    return uf?.trim().toUpperCase() || '';
  }

  static normalizeMunicipio(municipio: string): string {
    return municipio?.trim().toUpperCase() || '';
  }

  isValid(): boolean {
    return !!(
      this.uf?.trim() && 
      this.municipio?.trim() &&
      this.uf.length === 2
    );
  }
}