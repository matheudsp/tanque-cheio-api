import { Body, Controller, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CsvFileProcessor } from './processors/csv-file.processor';
import { FileTransformerCsv } from './services/file-transformer-csv.service';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { DownloadSpreadsheetDto } from '../gas-station/dtos/gas-station.dto';
import { responseOk, responseBadRequest } from '@/common/utils/response-api';

@ApiTags('Sincronizar Dados')
@Controller({ path: 'data-sync', version: '1' })
export class DataSyncController {
  private readonly logger = new Logger(DataSyncController.name);

  constructor(
    private readonly csvProcessor: CsvFileProcessor,
    private readonly fileTransformer: FileTransformerCsv,
  ) {}

  @Post('process-csv')
  @ApiOperation({
    summary: 'Process ANP CSV file',
    description: 'Processes local CSV file with ANP fuel price data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV processed successfully',
  })
  @OpenApiResponses([HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR])
  async processCsv() {
    try {
      const fileToProcess = 'anp-mes5-semana4.csv';

      this.logger.log(`Processing file: ${fileToProcess}`);

      const result = await this.csvProcessor.processFile(fileToProcess);

      return responseOk({
        message: `${result.totalProcessed} records processed successfully`,
        data: result,
      });
    } catch (error) {
      this.logger.error('CSV processing failed:', error);
      return responseBadRequest({ error: error.message });
    }
  }

  // @Post('download-spreadsheet')
  // @ApiOperation({
  //   summary: 'Download and process ANP spreadsheet',
  //   description: 'Downloads and processes official ANP XLSX file'
  // })
  // async downloadSpreadsheet(@Body() body: DownloadSpreadsheetDto) {
  //   try {
  //     // Implementation would use fileTransformer service
  //     const result = await this.fileTransformer.processFile(
  //       body.url,
  //       'anp-spreadsheet.xlsx',
  //       { validateContent: true, customValidation: true }
  //     );

  //     if (!result.success) {
  //       return responseBadRequest({ error: result.errors });
  //     }

  //     // Process the converted CSV
  //     const processResult = await this.csvProcessor.processFile(
  //       result.processedFile.csvPath
  //     );

  //     // Cleanup temporary files
  //     await this.fileTransformer.cleanup(result.processedFile.tempFiles);

  //     return responseOk({
  //       message: 'Spreadsheet downloaded and processed successfully',
  //       data: processResult
  //     });
  //   } catch (error) {
  //     this.logger.error('Spreadsheet processing failed:', error);
  //     return responseBadRequest({ error: error.message });
  //   }
  // }
}
