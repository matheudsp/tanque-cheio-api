import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('/')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getApp() {
    return this.appService.getApp;
  }
}
