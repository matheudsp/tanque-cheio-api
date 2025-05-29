import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthCheckResult } from './health.service';

@ApiTags('Verificação da API')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Verificar saúde geral da API',
    description: 'Retorna informações completas sobre o status da API, incluindo banco de dados, memória e uptime'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Status da aplicação',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'error'] },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', description: 'Tempo de atividade em segundos' },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['connected', 'disconnected'] },
            responseTime: { type: 'number', description: 'Tempo de resposta em ms' }
          }
        },
        memory: {
          type: 'object',
          properties: {
            used: { type: 'string' },
            total: { type: 'string' },
            percentage: { type: 'string' }
          }
        },
        environment: { type: 'string' }
      }
    }
  })
  async getHealth(): Promise<HealthCheckResult> {
    return this.healthService.getHealthStatus();
  }

  @Get('simple')
  @ApiOperation({ 
    summary: 'Verificação simples de saúde',
    description: 'Retorna um status básico para verificação rápida'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Status básico da aplicação',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  getSimpleHealth() {
    return this.healthService.getSimpleStatus();
  }

  @Get('database')
  @ApiOperation({ 
    summary: 'Verificar conexão com banco de dados',
    description: 'Testa especificamente a conexão com o banco de dados'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Status da conexão com banco de dados',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['connected', 'disconnected'] },
        responseTime: { type: 'number', description: 'Tempo de resposta em ms' }
      }
    }
  })
  async getDatabaseHealth() {
    return this.healthService.getDatabaseStatus();
  }
}