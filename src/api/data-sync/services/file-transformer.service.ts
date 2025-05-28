import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { FileDownloaderService } from './file-downloader.service';
import { XlsxToCsvConverterService} from './xlsx-to-csv-converter.service';
import type { ProcessedFileInfo } from '../interfaces/xlsx-to-csv.interface';


export interface FileTransformationResult {
  success: boolean;
  processedFile?: ProcessedFileInfo;
  tempFiles?: string[];
  errors?: string[];
}

@Injectable()
export class FileTransformerService {
  private readonly logger = new Logger(FileTransformerService.name);

  constructor(
    private readonly fileDownloader: FileDownloaderService,
    private readonly xlsxToCsvConverter: XlsxToCsvConverterService,
  ) {}

  async downloadAndConvert(url: string): Promise<FileTransformationResult> {
    const tempFiles: string[] = [];
    const errors: string[] = [];

    try {
      this.logger.log(`Starting download and conversion process for: ${url}`);

      // Step 1: Download the file
      const downloadResult = await this.fileDownloader.downloadFile(url);
      
      if (!downloadResult.success || !downloadResult.filePath) {
        errors.push(downloadResult.error || 'Download failed');
        return { success: false, errors, tempFiles };
      }

      tempFiles.push(downloadResult.filePath);
      this.logger.log(`File downloaded: ${downloadResult.fileName}`);

      // Step 2: Convert XLSX to CSV
      const conversionResult = await this.xlsxToCsvConverter.convertToCsv(downloadResult.filePath);
      
      if (!conversionResult.success || !conversionResult.csvPath) {
        errors.push(conversionResult.error || 'Conversion failed');
        return { success: false, errors, tempFiles };
      }

      tempFiles.push(conversionResult.csvPath);
      this.logger.log(`File converted to CSV: ${conversionResult.csvFileName}`);

      // Step 3: Validate the CSV structure
      const validationResult = await this.xlsxToCsvConverter.validateCsvStructure(conversionResult.csvPath);
      
      if (!validationResult.isValid) {
        errors.push(...validationResult.errors);
        this.logger.warn(`Validation issues found: ${validationResult.errors.join(', ')}`);
      }

      if (validationResult.warnings.length > 0) {
        this.logger.warn(`Validation warnings: ${validationResult.warnings.join(', ')}`);
      }

      // Step 4: Get file size for the converted CSV
      const csvStats = await fs.stat(conversionResult.csvPath);

      const processedFile: ProcessedFileInfo = {
        csvPath: conversionResult.csvPath,
        originalName: downloadResult.fileName || 'downloaded_file',
        rowCount: conversionResult.rowCount || 0,
        columnCount: conversionResult.columnCount || 0,
        fileSize: csvStats.size,
        headers: conversionResult.headers || [],
        validationResult,
      };

      this.logger.log(
        `File transformation completed successfully: ${processedFile.rowCount} rows, ${processedFile.columnCount} columns`
      );

      return {
        success: true,
        processedFile,
        tempFiles,
      };

    } catch (error) {
      this.logger.error(`File transformation failed: ${error.message}`, error.stack);
      errors.push(`Transformation failed: ${error.message}`);
      
      return {
        success: false,
        errors,
        tempFiles,
      };
    }
  }

  async cleanupFiles(filePaths: string[]): Promise<void> {
    await this.fileDownloader.cleanupTempFiles(filePaths);
  }
}