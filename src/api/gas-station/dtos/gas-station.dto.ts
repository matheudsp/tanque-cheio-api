import { ApiProperty, ApiSchema } from '@nestjs/swagger';

@ApiSchema({ name: 'Gas Station' })
export class GasStationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nome_razao: string;

  @ApiProperty({ required: false })
  nome_fantasia?: string | null;

  @ApiProperty({ required: false })
  bandeira?: string | null;

  @ApiProperty()
  cnpj: string;

  @ApiProperty()
  ativo: boolean;

  @ApiProperty()
  criadoEm: Date;

  @ApiProperty()
  atualizadoEm: Date;

  @ApiProperty()
  localizacao_id: string;
}

@ApiSchema({ name: 'Gas Station Query' })
export class GasStationQueryDto {
  @ApiProperty({ required: false })
  municipio?: string;

  @ApiProperty({ required: false })
  produto?: string;

  @ApiProperty({ required: false })
  bandeira?: string;

  @ApiProperty({ required: false })
  limite?: number;

  @ApiProperty({ required: false })
  offset?: number;
}

@ApiSchema({ name: 'Nearby Stations Query' })
export class NearbyStationsQueryDto {
  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty({ required: false })
  radius?: number;

  @ApiProperty({ required: false })
  produto?: string;

  @ApiProperty({ required: false })
  limite?: number;
}

