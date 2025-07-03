import { Injectable, Logger } from '@nestjs/common';
import { LocalizationRepository } from './repositories/localization.repository';
import {
  ResponseApi,
  responseBadRequest,
  responseInternalServerError,
  responseOk,
  responseNotFound,
} from '@/common/utils/response-api';
import {
  localizationCreateSchema,
  localizationQuerySchema,
  LocalizationQuerySchema,
} from './schemas/localization.schema';
import { zodErrorParse, metaPagination } from '@/common/utils/lib';
import { LocalizationCreateDto } from './dtos/localization.dto';

@Injectable()
export class LocalizationService {
  private readonly logger = new Logger(LocalizationService.name);

  constructor(private readonly localization_repo: LocalizationRepository) {}

  async index(query: LocalizationQuerySchema): Promise<ResponseApi> {
    try {
      const parsed_query = localizationQuerySchema.parse(query);
      const [localizations, total] =
        await this.localization_repo.findAll(parsed_query);
      const meta = metaPagination({ ...parsed_query, total });

      return responseOk({ data: localizations });
    } catch (error) {
      const zod_err = zodErrorParse(error);
      if (zod_err.isError) return responseBadRequest({ error: zod_err.errors });

      this.logger.error(`Error in index: ${error.message}`, error.stack);
      return responseInternalServerError({ message: error.message });
    }
  }

  async show(id: string): Promise<ResponseApi> {
    try {
      const localization = await this.localization_repo.findById(id);
      if (!localization) {
        return responseNotFound({ message: 'Localization not found' });
      }
      return responseOk({ data: localization });
    } catch (error) {
      this.logger.error(`Error in show: ${error.message}`, error.stack);
      return responseInternalServerError({ message: error.message });
    }
  }

  async update(id: string, data: LocalizationCreateDto): Promise<ResponseApi> {
    try {
      const parsed_data = localizationCreateSchema.parse(data);

      const localization = await this.localization_repo.findById(id);
      if (!localization) {
        return responseNotFound({ message: 'Localization not found' });
      }

      await this.localization_repo.update(id, parsed_data);
      const updated_localization = await this.localization_repo.findById(id);

      return responseOk({ data: updated_localization });
    } catch (error) {
      const zod_err = zodErrorParse(error);
      if (zod_err.isError) return responseBadRequest({ error: zod_err.errors });

      this.logger.error(`Error in update: ${error.message}`, error.stack);
      return responseInternalServerError({ message: error.message });
    }
  }
}
