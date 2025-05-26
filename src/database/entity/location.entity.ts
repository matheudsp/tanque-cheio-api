import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { GasStation } from './gas-station.entity';

@Entity('localizacao')
@Index(['uf', 'municipio'])
@Index(['cep'])
export class Localizacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  regiao_sigla?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: false })
  uf: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  municipio: string;

  @Column({ type: 'text', nullable: true })
  endereco?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bairro?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cep?: string | null;

  @Column({ type: 'decimal', precision: 50, scale: 8, nullable: true })
  latitude?: number | null;

  @Column({ type: 'decimal', precision: 50, scale: 8, nullable: true })
  longitude?: number | null;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;

  // Relacionamento: Uma localização pode ter vários postos
  @OneToMany(() => GasStation, (gasStation) => gasStation.localizacao)
  postos: GasStation[];

  // Método para criar uma chave única baseada nos dados de localização
  getLocationKey(): string {
    const parts = [
      this.uf?.trim().toUpperCase(),
      this.municipio?.trim().toUpperCase(),
      this.endereco?.trim().toUpperCase(),
      this.bairro?.trim().toUpperCase(),
      this.cep?.replace(/[^\d]/g, '')
    ].filter(Boolean);
    
    return parts.join('|');
  }

  // Método para verificar se duas localizações são similares
  isSimilarTo(other: Localizacao): boolean {
    const normalize = (str?: string) => str?.trim().toUpperCase() || '';
    
    return (
      normalize(this.uf) === normalize(other.uf) &&
      normalize(this.municipio) === normalize(other.municipio) &&
      normalize(this.endereco!) === normalize(other.endereco!) &&
      normalize(this.bairro!) === normalize(other.bairro!) &&
      this.normalizeCep() === other.normalizeCep()
    );
  }

  private normalizeCep(): string {
    return this.cep?.replace(/[^\d]/g, '') || '';
  }
}