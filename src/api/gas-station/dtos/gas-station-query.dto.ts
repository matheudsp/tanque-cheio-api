import { ApiProperty, ApiSchema } from '@nestjs/swagger';

@ApiSchema({ name: 'Gas Station' })
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


