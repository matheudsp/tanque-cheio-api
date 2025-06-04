import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('data_sync_logs')
export class DataSyncLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  filename: string;

  @Column('json')
  log_data: any;

  @CreateDateColumn()
  created_at: Date;
}