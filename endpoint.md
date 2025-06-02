# API REST - Endpoints com Boas Práticas de Engenharia de Software

## Estrutura Base da API

### Versionamento
```
GET /api/v1/...
```
- Sempre incluir versão na URL
- Usar versionamento semântico
- Manter compatibilidade com versões anteriores

### Headers Padrão
```
Accept: application/json
Content-Type: application/json
API-Version: v1
```

## 1. Recursos de Postos (Gas Stations)

### Coleção Principal
```
GET /api/v1/gas-stations
```
**Query Parameters:**
- `page=1` (default: 1)
- `limit=20` (default: 20, max: 100)
- `sort=name` (options: name, brand, city, state)
- `order=asc` (asc/desc)
- `state=SP`
- `city=São Paulo`
- `brand=Shell`
- `active=true`
- `fields=id,name,brand,city` (field selection)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Posto ABC",
      "brand": "Shell",
      "city": "São Paulo",
      "state": "SP",
      "isActive": true,
      "location": {
        "latitude": -23.5505,
        "longitude": -46.6333
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "links": {
    "self": "/api/v1/gas-stations?page=1",
    "next": "/api/v1/gas-stations?page=2",
    "last": "/api/v1/gas-stations?page=8"
  }
}
```

### Recurso Individual
```
GET /api/v1/gas-stations/{id}
```
**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Posto ABC",
    "tradeName": "Super Posto",
    "brand": "Shell",
    "taxId": "12.345.678/0001-90",
    "address": {
      "street": "Rua das Flores, 123",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01234-567"
    },
    "location": {
      "latitude": -23.5505,
      "longitude": -46.6333
    },
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:45:00Z"
  }
}
```

### Sub-recursos do Posto
```
GET /api/v1/gas-stations/{id}/prices
GET /api/v1/gas-stations/{id}/prices/current
GET /api/v1/gas-stations/{id}/prices/history
```

## 2. Recursos de Preços (Prices)

### Preços Atuais
```
GET /api/v1/prices/current
```
**Query Parameters:**
- `gas_station_id=uuid`
- `product_id=uuid`
- `state=SP`
- `city=São Paulo`
- `lat=-23.5505&lng=-46.6333&radius=10` (raio em km)

### Histórico de Preços
```
GET /api/v1/prices/history
```
**Query Parameters:**
- `gas_station_id=uuid`
- `product_id=uuid`
- `start_date=2024-01-01`
- `end_date=2024-01-31`
- `interval=daily` (daily, weekly, monthly)

## 3. Busca e Filtros Avançados

### Busca Global
```
GET /api/v1/search
```
**Query Parameters:**
- `q=shell posto` (texto livre)
- `type=gas_station` (gas_station, product, location)
- `filters[state]=SP`
- `filters[city]=São Paulo`

### Busca Geográfica
```
GET /api/v1/gas-stations/nearby
```
**Query Parameters:**
- `lat=-23.5505` (required)
- `lng=-46.6333` (required)
- `radius=5` (km, default: 5, max: 50)
- `product_id=uuid`

## 4. Análises e Estatísticas

### Comparação de Preços
```
GET /api/v1/analytics/price-comparison
```
**Query Parameters:**
- `product_id=uuid` (required)
- `gas_station_ids[]=uuid1&gas_station_ids[]=uuid2`
- `state=SP`
- `city=São Paulo`

### Rankings
```
GET /api/v1/analytics/rankings/cheapest
GET /api/v1/analytics/rankings/most-expensive
```

### Estatísticas Regionais
```
GET /api/v1/analytics/regional-stats
```
**Query Parameters:**
- `product_id=uuid`
- `state=SP`
- `city=São Paulo`
- `period=30d` (7d, 30d, 90d, 1y)

## 5. Recursos de Produtos

### Lista de Produtos
```
GET /api/v1/products
```
**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Gasolina Comum",
      "category": "gasoline",
      "unit": "liter",
      "isActive": true
    }
  ]
}
```

### Produto Individual
```
GET /api/v1/products/{id}
```

## 6. Recursos de Localização

### Estados
```
GET /api/v1/locations/states
```

### Cidades por Estado
```
GET /api/v1/locations/states/{state}/cities
```

### Regiões com Dados
```
GET /api/v1/locations/coverage
```

## 7. Relatórios e Dashboards

### Dados para Dashboard
```
GET /api/v1/reports/dashboard-summary
```
**Query Parameters:**
- `state=SP`
- `city=São Paulo`
- `period=30d`

### Relatório de Tendências
```
GET /api/v1/reports/price-trends
```
**Query Parameters:**
- `product_id=uuid`
- `state=SP`
- `interval=weekly`
- `start_date=2024-01-01`
- `end_date=2024-01-31`

## Boas Práticas Implementadas

### 1. Estrutura de Resposta Consistente
```json
{
  "data": {}, // ou []
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  },
  "links": {
    "self": "...",
    "next": "...",
    "prev": "...",
    "first": "...",
    "last": "..."
  }
}
```

### 2. Tratamento de Erros
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "limit",
        "message": "Must be between 1 and 100"
      }
    ],
    "timestamp": "2024-01-20T10:30:00Z",
    "requestId": "req_12345"
  }
}
```

### 3. Status Codes HTTP
- `200 OK` - Sucesso
- `400 Bad Request` - Parâmetros inválidos
- `404 Not Found` - Recurso não encontrado
- `422 Unprocessable Entity` - Dados válidos mas não processáveis
- `429 Too Many Requests` - Rate limit excedido
- `500 Internal Server Error` - Erro interno

### 4. Filtros e Validações
```typescript
// Exemplo de validação de query params
interface GasStationQuery {
  page?: number; // min: 1, default: 1
  limit?: number; // min: 1, max: 100, default: 20
  sort?: 'name' | 'brand' | 'city' | 'state';
  order?: 'asc' | 'desc';
  state?: string; // 2 chars
  city?: string;
  brand?: string;
  active?: boolean;
  fields?: string[]; // whitelist allowed fields
}
```

### 5. Caching Strategy
```
Cache-Control: public, max-age=300
ETag: "hash-do-conteudo"
Last-Modified: Wed, 21 Oct 2015 07:28:00 GMT
```

### 6. Rate Limiting
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
```

### 7. Field Selection (Sparse Fieldsets)
```
GET /api/v1/gas-stations?fields=id,name,brand,city
```

### 8. Includes/Embedding
```
GET /api/v1/gas-stations/{id}?include=current_prices,location
```

### 9. Filtering Conventions
```
GET /api/v1/gas-stations?filter[state]=SP&filter[active]=true
```

### 10. Sorting
```
GET /api/v1/gas-stations?sort=name,-createdAt
```
(- para DESC, + ou sem prefixo para ASC)

## Estrutura de Projeto Sugerida

```
src/
├── controllers/
│   ├── gas-stations.controller.ts
│   ├── prices.controller.ts
│   ├── analytics.controller.ts
│   └── reports.controller.ts
├── services/
│   ├── gas-stations.service.ts
│   ├── prices.service.ts
│   └── cache.service.ts
├── validators/
│   ├── gas-stations.validator.ts
│   └── common.validator.ts
├── middlewares/
│   ├── rate-limit.middleware.ts
│   ├── cache.middleware.ts
│   └── validation.middleware.ts
├── utils/
│   ├── pagination.util.ts
│   ├── response.util.ts
│   └── query-builder.util.ts
└── types/
    ├── api.types.ts
    └── query.types.ts
```

## Exemplo de Implementação Controller

```typescript
@Controller('/api/v1/gas-stations')
export class GasStationsController {
  @Get()
  @UseInterceptors(CacheInterceptor)
  @UsePipes(ValidationPipe)
  async findAll(@Query() query: GasStationQuery): Promise<PaginatedResponse<GasStation>> {
    const result = await this.gasStationsService.findAll(query);
    return ResponseUtil.paginated(result, query);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('include') include?: string[]
  ): Promise<ApiResponse<GasStation>> {
    const gasStation = await this.gasStationsService.findOne(id, include);
    if (!gasStation) {
      throw new NotFoundException('Gas station not found');
    }
    return ResponseUtil.success(gasStation);
  }
}
```