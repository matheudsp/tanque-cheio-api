import { ApiProperty, ApiSchema } from '@nestjs/swagger';

@ApiSchema({ name: 'Gas Station' })
export class GasStationQueryDto {
  @ApiProperty({ required: false })
  municipio?: string;
  @ApiProperty({ required: false })
  produto?: string;
  @ApiProperty({ required: false })
  bandeira?: string;
  @ApiProperty({ required: false })
  limit?: number;
  @ApiProperty({ required: false })
  offset?: number;
}


