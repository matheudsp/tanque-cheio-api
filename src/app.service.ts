import { Injectable } from '@nestjs/common';
import { responseOk, type ResponseApi } from './common/utils/response-api';

@Injectable()
export class AppService {
  async getApp(): Promise<ResponseApi> {
    const data = "Hello World";
    return responseOk({ data });
  }
}
