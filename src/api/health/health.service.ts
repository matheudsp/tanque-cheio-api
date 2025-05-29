import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected';
    responseTime?: number;
  };
  memory: {
    used: string;
    total: string;
    percentage: string;
  };
  environment: string;
}

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async getHealthStatus(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    // Verificar conexão com banco de dados
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    let dbResponseTime: number | undefined;
    
    try {
      await this.dataSource.query('SELECT 1');
      dbStatus = 'connected';
      dbResponseTime = Date.now() - startTime;
    } catch (error) {
      dbStatus = 'disconnected';
    }

    // Informações de memória
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = ((usedMemory / totalMemory) * 100).toFixed(2);

    return {
      status: dbStatus === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
      },
      memory: {
        used: this.formatBytes(usedMemory),
        total: this.formatBytes(totalMemory),
        percentage: `${memoryPercentage}%`,
      },
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async getDatabaseStatus(): Promise<{ status: string; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'connected',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'disconnected',
        responseTime: 0,
      };
    }
  }

  getSimpleStatus(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}