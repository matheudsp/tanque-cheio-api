import { ApiProperty } from '@nestjs/swagger';
import { IsUrl, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class DownloadSpreadsheetDto {
  @ApiProperty({
    description: 'URL da planilha XLSX da ANP para download',
    example:
      'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/2025/revendas_lpc_2025-05-18_2025-05-24.xlsx',
    required: true,
  })
  @IsUrl({}, { message: 'URL deve ser válida' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  url: string;
}
