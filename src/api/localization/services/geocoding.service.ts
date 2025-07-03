import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, timeout } from 'rxjs';

import {
  responseInternalServerError,
  responseOk,
  ResponseApi,
  responseNotFound,
} from '@/common/utils/response-api';
import { LocalizationEntity } from '@/database/entity/localization.entity';
import { LocalizationRepository } from '../repositories/localization.repository';
import type { GeocodeResponse } from '../interfaces/geocoding.interface';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly googleApiKey: string;

  constructor(
    private readonly localizationRepo: LocalizationRepository,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_GEOCODING_API_KEY');
    if (!apiKey) {
      this.logger.error('GOOGLE_GEOCODING_API_KEY não configurada.');
      throw new Error('GOOGLE_GEOCODING_API_KEY não configurada.');
    }
    this.googleApiKey = apiKey;
  }

  async findAllWithoutCoordinates(): Promise<ResponseApi> {
    try {
      const data = await this.localizationRepo.findAllWithoutCoordinates();
      return responseOk({ data });
    } catch (error) {
      this.logger.error(`Error: ${error.message}`, error.stack);
      return responseInternalServerError({ message: error.message });
    }
  }

  async countAllWithoutCoordinates(): Promise<ResponseApi> {
    try {
      const data = await this.localizationRepo.countAllWithoutCoordinates();
      return responseOk({ data });
    } catch (error) {
      this.logger.error(`Error: ${error.message}`, error.stack);
      return responseInternalServerError({ message: error.message });
    }
  }

  /**
   * Geocodes a single address by its ID.
   * @param id The ID of the localization record.
   * @returns The updated localization record with coordinates.
   */
  async geocodeById(id: string): Promise<ResponseApi> {
    try {
      const loc = await this.localizationRepo.findById(id);
      if (!loc) {
        return responseNotFound({ message: 'Localization not found' });
      }

      await this.geocodeAndSave(loc);
      const updated = await this.localizationRepo.findById(id);
      return responseOk({ data: updated });
    } catch (error) {
      this.logger.error(
        `Error geocoding by ID ${id}: ${error.message}`,
        error.stack,
      );
      return responseInternalServerError({ message: error.message });
    }
  }

  /**
   * Geocodes all localizations that do not have coordinates yet, in a batch process.
   * @returns A summary of the batch operation.
   */
  async geocodeAll(batchSize = 1000): Promise<ResponseApi> {
    try {
      const list =
        await this.localizationRepo.findAllWithoutCoordinates(batchSize);
      if (list.length === 0) {
        return responseOk({ message: 'No localizations to geocode.' });
      }

      let success = 0;
      let errors = 0;

      for (const loc of list) {
        try {
          await this.geocodeAndSave(loc);
          success++;
        } catch (e) {
          errors++;
          this.logger.error(
            `Erro geocoding localization → ID=${loc.id}: ${e.message}`,
          );
        }
      }

      return responseOk({
        data: { processed: list.length, success, errors },
      });
    } catch (error) {
      this.logger.error(
        `Error in batch geocoding: ${error.message}`,
        error.stack,
      );
      return responseInternalServerError({ message: error.message });
    }
  }

  /**
   * Performs the geocoding request and saves the result.
   * @param localization The localization entity to process.
   * @returns The updated localization entity.
   */
  private async geocodeAndSave(loc: LocalizationEntity): Promise<void> {
    const params = new URLSearchParams();
    if (loc.address) {
      const line = loc.number
        ? `${loc.address.trim()}, ${loc.number.trim()}`
        : loc.address.trim();
      params.append('address.addressLines', line);
    }
    if (loc.neighborhood) {
      params.append('address.addressLines', loc.neighborhood.trim());
    }
    params.append('address.locality', loc.city.trim());
    params.append('address.administrativeArea', loc.state.trim());
    if (loc.zip_code) {
      params.append('address.postalCode', loc.zip_code.trim());
    }
    params.append('address.regionCode', 'BR');
    params.append('key', this.googleApiKey);
    params.append('languageCode', 'pt-BR');

    const url = `https://geocode.googleapis.com/v4beta/geocode/address?${params.toString()}`;

    let responseData: GeocodeResponse;
    try {
      const axiosResponse = await firstValueFrom(
        this.httpService
          .get<GeocodeResponse>(url, {
            headers: { 'X-Goog-Api-Key': this.googleApiKey },
          })
          .pipe(
            timeout(5000),
            catchError((err) => {
              throw new InternalServerErrorException(
                `HTTP error: ${err.message}`,
              );
            }),
          ),
      );
      responseData = axiosResponse.data;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException(err.message);
    }

    if (
      !Array.isArray(responseData.results) ||
      responseData.results.length === 0
    ) {
      this.logger.error(
        `Geocoding returned no results for ID=${loc.id}. Payload: ${JSON.stringify(responseData)}`,
      );
      throw new BadRequestException(
        `Geocoding failed for ID=${loc.id}. ${
          responseData.errorMessage ? `Error: ${responseData.errorMessage}` : ''
        }`,
      );
    }

    const first = responseData.results[0];
    if (!first.location || typeof first.location.latitude !== 'number') {
      this.logger.error(
        `Malformed geocoding result for ID=${loc.id}. Payload: ${JSON.stringify(first)}`,
      );
      throw new BadRequestException(
        `Invalid geocoding result for ID=${loc.id}.`,
      );
    }

    const { latitude, longitude } = first.location;

    await this.localizationRepo.update(loc.id, {
      coordinates: { type: 'Point', coordinates: [longitude, latitude] },
    });
  }
}
