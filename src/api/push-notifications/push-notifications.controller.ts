import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Req,
  Res,
} from '@nestjs/common';
import { PushNotificationService } from './push-notifications.service';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards/auth/auth.guard';
import { Request, Response } from 'express';
import {
  SendNotificationDto,
  type RegisterPushTokenDto,
} from './dtos/push-notications.dto';

@ApiTags('Push Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ version: ['1'], path: 'notifications' })
export class PushNotificationsController {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Post('send/user/:userId')
  @ApiOperation({ summary: 'Envia uma notificação para um usuário específico' })
  @ApiBody({ type: SendNotificationDto })
  async sendNotificationToUser(
    @Param('userId') userId: string,
    @Body() body: SendNotificationDto,
  ) {
    await this.pushNotificationService.sendToUser(userId, body);
    return {
      message: 'Notificação(ões) enviada(s) para a fila de processamento.',
    };
  }

  @Post('tokens/register')
  @ApiOperation({
    summary: 'Registra um Expo Push Token para o usuário autenticado',
  })
  async registerToken(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: RegisterPushTokenDto,
  ) {
    const userId = req.user?.user_id;

    if (!userId) {
      throw new BadRequestException(
        'ID do usuário não encontrado no token de autenticação.',
      );
    }
    const r = await this.pushNotificationService.registerToken(
      userId,
      body.token,
    );

    res.status(r.statusCode).send(r);
  }
}
