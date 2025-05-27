import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface FileDownloadResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  error?: string;
}

@Injectable()
export class FileDownloaderService {
  private readonly logger = new Logger(FileDownloaderService.name);
  private readonly tempDir = path.join(process.cwd(), 'temp');

  constructor(private readonly httpService: HttpService) {
    this.ensureTempDirectory();
  }

  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
      this.logger.log(`Created temp directory: ${this.tempDir}`);
    }
  }

  async downloadFile(url: string): Promise<FileDownloadResult> {
    try {
      this.logger.log(`Starting download from: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,*/*',
          },
        })
      );

      if (!response.data) {
        throw new Error('No data received from server');
      }

      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const fileExtension = this.getFileExtensionFromUrl(url) || this.getExtensionFromContentType(contentType);
      const fileName = `download_${randomUUID()}${fileExtension}`;
      const filePath = path.join(this.tempDir, fileName);

      await fs.writeFile(filePath, Buffer.from(response.data));

      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      this.logger.log(`File downloaded successfully: ${fileName} (${fileSize} bytes)`);

      return {
        success: true,
        filePath,
        fileName,
        fileSize,
        contentType,
      };
    } catch (error) {
      this.logger.error(`Download failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: `Download failed: ${error.message}`,
      };
    }
  }

  private getFileExtensionFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const extension = path.extname(pathname);
      return extension || '.xlsx'; // Default to .xlsx for ANP files
    } catch {
      return '.xlsx';
    }
  }

  private getExtensionFromContentType(contentType: string): string {
    const typeMap: Record<string, string> = {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-excel': '.xls',
      'text/csv': '.csv',
      'application/csv': '.csv',
    };

    return typeMap[contentType.toLowerCase()] || '.xlsx';
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.log(`Deleted temporary file: ${filePath}`);
    } catch (error) {
      this.logger.warn(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }

  async cleanupTempFiles(filePaths: string[]): Promise<void> {
    await Promise.allSettled(
      filePaths.map(filePath => this.deleteFile(filePath))
    );
  }
}