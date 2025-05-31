import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsDateString, Min, Max, IsEnum } from 'class-validator';

@ApiSchema({ name: 'Historico de Preco' })
export class PriceHistoryDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  data_coleta: Date;
  @ApiProperty()
  preco_venda: number;
  @ApiProperty()
  ativo: boolean;
  @ApiProperty()
  atualizadoEm: Date;
  @ApiProperty()
  criadoEm: Date;
}

@ApiSchema({ name: 'Price History Query' })
export class PriceHistoryQueryDto {
  @ApiProperty({ 
    description: 'ID do produto (UUID ou nome do produto)',
    required: false 
  })
  @IsOptional()
  @IsString()
  produto_id?: string;

  @ApiProperty({ 
    description: 'Data de início para filtro (YYYY-MM-DD)',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiProperty({ 
    description: 'Data de fim para filtro (YYYY-MM-DD)',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiProperty({ 
    description: 'Limite de registros retornados (1-1000)',
    default: 100,
    required: false 
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(1000)
  limite?: number;
}

@ApiSchema({ name: 'Gas Station Price History Query' })
export class GasStationPriceHistory {
  @ApiProperty({ 
    description: 'Nome do produto para filtrar (GLP, GASOLINA, DIESEL, etc.)',
    required: false 
  })
  @IsOptional()
  @IsString()
  produto?: string;

  @ApiProperty({ 
    description: 'Período para consulta',
    enum: ['semana', 'mes'],
    required: false 
  })
  @IsOptional()
  @IsString()
  periodo?: 'semana' | 'mes';

  @ApiProperty({ 
    description: 'Limite de registros',
    default: 50,
    required: false 
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(1000)
  limite?: number;
}

@ApiSchema({ name: 'Price Chart Query' })
export class PriceChartQueryDto {
  @ApiProperty({ 
    description: 'Período para o gráfico',
    enum: ['semana', 'mes', 'trimestre', 'semestre', 'ano'],
    default: 'mes',
    required: false 
  })
  @IsOptional()
  @IsEnum(['semana', 'mes', 'trimestre', 'semestre', 'ano'])
  periodo?: 'semana' | 'mes' | 'trimestre' | 'semestre' | 'ano';

  @ApiProperty({ 
    description: 'Limite de pontos no gráfico',
    default: 30,
    required: false 
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(5)
  @Max(100)
  limit?: number;
}

// Response DTOs otimizados para o frontend

@ApiSchema({ name: 'Latest Price Item' })
export class LatestPriceItemDto {
  @ApiProperty({ description: 'Nome do produto' })
  product: string;

  @ApiProperty({ description: 'Preço atual' })
  price: number;

  @ApiProperty({ description: 'Data da coleta' })
  date: string;

  @ApiProperty({ description: 'Unidade de medida' })
  unit: string;

  @ApiProperty({ description: 'Variação em relação ao preço anterior', required: false })
  variation?: number;

  @ApiProperty({ description: 'Variação percentual', required: false })
  variationPercent?: number;
}

@ApiSchema({ name: 'Dashboard Data' })
export class DashboardDataDto {
  @ApiProperty({ type: [LatestPriceItemDto], description: 'Últimos preços de todos os produtos' })
  latestPrices: LatestPriceItemDto[];

  @ApiProperty({ description: 'Total de produtos com preços' })
  totalProducts: number;

  @ApiProperty({ description: 'Última atualização' })
  lastUpdated: string;

  @ApiProperty({ description: 'ID do posto' })
  stationId: string;
}

@ApiSchema({ name: 'Chart Data Point' })
export class ChartDataPointDto {
  @ApiProperty({ description: 'Data (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ description: 'Preço' })
  price: number;

  @ApiProperty({ description: 'Variação em relação ao ponto anterior', required: false })
  variation?: number;

  @ApiProperty({ description: 'Variação percentual', required: false })
  variationPercent?: number;
}

@ApiSchema({ name: 'Chart Statistics' })
export class ChartStatsDto {
  @ApiProperty({ description: 'Preço mínimo no período' })
  min: number;

  @ApiProperty({ description: 'Preço máximo no período' })
  max: number;

  @ApiProperty({ description: 'Preço médio no período' })
  avg: number;

  @ApiProperty({ description: 'Tendência geral', enum: ['up', 'down', 'stable'] })
  trend: 'up' | 'down' | 'stable';
}

@ApiSchema({ name: 'Price Chart Response' })
export class PriceChartResponseDto {
  @ApiProperty({ description: 'Nome do produto' })
  product: string;

  @ApiProperty({ description: 'Período consultado' })
  periodo: string;

  @ApiProperty({ type: [ChartDataPointDto], description: 'Dados do gráfico' })
  data: ChartDataPointDto[];

  @ApiProperty({ type: ChartStatsDto, description: 'Estatísticas do período' })
  stats: ChartStatsDto;
}

@ApiSchema({ name: 'Product Summary' })
export class ProductSummaryDto {
  @ApiProperty({ description: 'Nome do produto' })
  produto: string;

  @ApiProperty({ description: 'Total de registros no período' })
  totalRegistros: number;

  @ApiProperty({ description: 'Preço mínimo' })
  precoMinimo: number;

  @ApiProperty({ description: 'Preço máximo' })
  precoMaximo: number;

  @ApiProperty({ description: 'Preço médio' })
  precoMedio: number;

  @ApiProperty({ description: 'Desvio padrão' })
  desvioPadrao: number;

  @ApiProperty({ description: 'Volatilidade (%)' })
  volatilidade: number;
}

@ApiSchema({ name: 'Price Summary Response' })
export class PriceSummaryResponseDto {
  @ApiProperty({ description: 'Período analisado' })
  periodo: string;

  @ApiProperty({ type: [ProductSummaryDto], description: 'Resumo por produto' })
  resumo: ProductSummaryDto[];
}

@ApiSchema({ name: 'Weekly Price' })
export class WeeklyPriceDto {
  @ApiProperty({ description: 'Semana' })
  semana: string;

  @ApiProperty({ description: 'Preço médio da semana' })
  preco: number;
}

@ApiSchema({ name: 'Product Trend' })
export class ProductTrendDto {
  @ApiProperty({ description: 'Nome do produto' })
  produto: string;

  @ApiProperty({ description: 'Tendência', enum: ['alta', 'baixa', 'estavel'] })
  tendencia: 'alta' | 'baixa' | 'estavel';

  @ApiProperty({ description: 'Variação absoluta' })
  variacao: number;

  @ApiProperty({ description: 'Variação percentual' })
  variacao_percentual: number;

  @ApiProperty({ type: [WeeklyPriceDto], description: 'Histórico semanal' })
  historico_semanal: WeeklyPriceDto[];
}

@ApiSchema({ name: 'Price Trends Response' })
export class PriceTrendsResponseDto {
  @ApiProperty({ description: 'Período analisado' })
  periodo: string;

  @ApiProperty({ type: [ProductTrendDto], description: 'Tendências por produto' })
  tendencias: ProductTrendDto[];
}

// DTOs legados mantidos para compatibilidade
@ApiSchema({ name: 'Price History Response' })
export class PriceHistoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  data_coleta: Date;

  @ApiProperty()
  preco_venda: number;

  @ApiProperty()
  ativo: boolean;

  @ApiProperty({ description: 'Informações do produto' })
  produto: {
    id: string;
    nome: string;
    categoria: string;
    unidade_medida: string;
  };

  @ApiProperty()
  criadoEm: Date;

  @ApiProperty()
  atualizadoEm: Date;
}

@ApiSchema({ name: 'Latest Prices Response' })
export class LatestPricesResponseDto {
  @ApiProperty({ description: 'Último preço do GLP', nullable: true })
  glp: PriceHistoryResponseDto | null;

  @ApiProperty({ description: 'Último preço da Gasolina', nullable: true })
  gasolina: PriceHistoryResponseDto | null;

  @ApiProperty({ description: 'Último preço do Diesel', nullable: true })
  diesel: PriceHistoryResponseDto | null;

  @ApiProperty({ description: 'Data da última atualização' })
  updatedAt: string;
}

@ApiSchema({ name: 'Detailed Price History Response' })
export class DetailedPriceHistoryResponseDto {
  @ApiProperty({ type: [PriceHistoryResponseDto] })
  results: PriceHistoryResponseDto[];

  @ApiProperty({ description: 'Total de registros encontrados' })
  total: number;

  @ApiProperty({ description: 'Período consultado' })
  periodo: string;

  @ApiProperty({ description: 'Produto consultado' })
  produto: string;
}