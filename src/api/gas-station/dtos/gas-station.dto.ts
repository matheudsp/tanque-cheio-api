import { ApiProperty, ApiSchema } from '@nestjs/swagger';

@ApiSchema({ name: 'Gas Station' })
export class GasStationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  legal_name: string;

  @ApiProperty({ required: false })
  trade_name?: string | null;

  @ApiProperty({ required: false })
  brand?: string | null;

  @ApiProperty()
  taxId: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  localization_id: string;
}

@ApiSchema({ name: 'Gas Station Query' })
export class GasStationQueryDto {
  @ApiProperty({ required: false })
  city?: string;

  @ApiProperty({ required: false })
  product?: string;

  @ApiProperty({ required: false })
  brand?: string;

  @ApiProperty({ required: false })
  limit?: number;

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
  product?: string;

  @ApiProperty({ required: false })
  limit?: number;
}

