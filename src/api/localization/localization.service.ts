import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { LocalizationRepository } from './repositories/localization.repository';
import { LocalizationEntity } from '@/database/entity/localization.entity';
import { responseOk } from '@/common/utils/response-api';
import {
  GeocodingResponse,
  GeocodingResult,
} from './interfaces/geocoding.interface';

@Injectable()
export class LocalizationService {
  private readonly logger = new Logger(LocalizationService.name);
  private readonly apiKey: string;
  private readonly requestDelay = 500; // ms

  constructor(
    private readonly localizationRepository: LocalizationRepository,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY')!;
    if (!this.apiKey) {
      this.logger.error('GOOGLE_MAPS_API_KEY não configurada');
      throw new Error(
        'GOOGLE_MAPS_API_KEY não está definida nas variáveis de ambiente',
      );
    }
  }

  async geocodeAll() {
    const allWithoutCoords =
      await this.localizationRepository.findWithoutCoordinates();
    this.logger.log(
      `Iniciando geocoding para ${allWithoutCoords.length} localizações`,
    );

    const results: GeocodingResult[] = [];
    let successCount = 0;

    for (const loc of allWithoutCoords) {
      const { success, id, latitude, longitude, address, error } =
        await this.safeGeocode(loc);
      results.push({ id, address, latitude, longitude, success, error });

      if (success) {
        successCount++;
        await this.localizationRepository.updateCoordinates(
          id,
          latitude!,
          longitude!,
        );
      }

      await this.delay(this.requestDelay);
    }

    const total = allWithoutCoords.length;
    const errors = total - successCount;
    this.logger.log(
      `Geocoding concluído: ${successCount} sucessos, ${errors} erros`,
    );

    return responseOk({
      data: { total, success: successCount, errors, results },
    });
  }

  async geocodeById(id: string) {
    const loc = await this.localizationRepository.findById(id);
    if (!loc) throw new BadRequestException('Localização não encontrada');

    const { success, latitude, longitude, address, error } =
      await this.safeGeocode(loc);
    if (success) {
      await this.localizationRepository.updateCoordinates(
        id,
        latitude!,
        longitude!,
      );
    }
    return responseOk({
      data: { id, address, latitude, longitude, success, error },
    });
  }

  private async safeGeocode(loc: LocalizationEntity): Promise<GeocodingResult> {
    const fullAddress = loc.getFullAddress();
    const searchAddress = this.buildSearchAddress(loc);

    if (!searchAddress) {
      return {
        id: loc.id,
        address: fullAddress,
        latitude: null,
        longitude: null,
        success: false,
        error: 'Endereço insuficiente para geocoding',
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<GeocodingResponse>(
          'https://maps.googleapis.com/maps/api/geocode/json',
          {
            params: { 
              address: searchAddress, 
              key: this.apiKey, 
              // Polarização de região
              region: 'br' },
          },
        ),
      );

      const { status, results, error_message } = response.data;
      if (status === 'OK' && results.length) {
        const { lat, lng } = results[0].geometry.location;
        return {
          id: loc.id,
          address: fullAddress,
          latitude: lat,
          longitude: lng,
          success: true,
        };
      }

      return {
        id: loc.id,
        address: fullAddress,
        latitude: null,
        longitude: null,
        success: false,
        error: `Geocoding falhou: ${status} - ${error_message ?? 'Endereço não encontrado'}`,
      };
    } catch (err) {
      const msg = err?.message ?? 'Erro desconhecido';
      this.logger.error(`Erro no geocoding para ${loc.id}: ${msg}`);
      return {
        id: loc.id,
        address: fullAddress,
        latitude: null,
        longitude: null,
        success: false,
        error: `Erro na requisição: ${msg}`,
      };
    }
  }

  private buildSearchAddress(loc: LocalizationEntity): string {
    const parts = [
      loc.address
        ? `${loc.address.trim()}${loc.number ? `, ${loc.number.trim()}` : ''}`
        : null,
      loc.neighborhood?.trim(),
      loc.city?.trim(),
      loc.state?.trim(),
      loc.zipCode?.trim(),
      'Brasil',
    ].filter(Boolean);

    // Se city ou state estiverem faltando, retorna string vazia para sinalizar erro
    if (!loc.city?.trim() || !loc.state?.trim()) return '';
    return parts.join(', ');
  }

  async getGeocodingStats() {
    const [withCoords, withoutCoords] = await Promise.all([
      this.localizationRepository.countWithCoordinates(),
      this.localizationRepository.countWithoutCoordinates(),
    ]);
    const total = withCoords + withoutCoords;
    const percentage = total
      ? Math.round((withCoords / total) * 10000) / 100
      : 0;

    return responseOk({
      data: {
        total,
        withCoordinates: withCoords,
        withoutCoordinates: withoutCoords,
        percentageComplete: percentage,
      },
    });
  }

  private delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
