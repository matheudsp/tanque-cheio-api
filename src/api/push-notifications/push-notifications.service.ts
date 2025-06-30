import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import Expo, {
  ExpoPushMessage,
  ExpoPushTicket,
  ExpoPushSuccessTicket,
} from 'expo-server-sdk';

import { Cron, CronExpression } from '@nestjs/schedule';
import { PushNotificationsRepository } from './repositories/push-notifications.repository';
import {
  responseInternalServerError,
  responseOk,
  type ResponseApi,
} from '@/common/utils/response-api';
import { FavoritesRepository } from '../favorites/repositories/favorites.repository';
import { PriceHistoryRepository } from '../price-history/repositories/price-history.repository';

@Injectable()
export class PushNotificationService {
  private readonly expo: Expo;
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    private readonly pushNotificationsRepo: PushNotificationsRepository,
    private readonly favoritesRepo: FavoritesRepository,
    private readonly priceHistoryRepo: PriceHistoryRepository,
  ) {
    this.expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
  }

  async registerToken(userId: string, token: string): Promise<ResponseApi> {
    if (!Expo.isExpoPushToken(token)) {
      throw new BadRequestException('Token fornecido é inválido.');
    }

    try {
      await this.pushNotificationsRepo.upsertToken(userId, token);
      this.logger.log(`Token registrado com sucesso para o usuário ${userId}`);
      return responseOk({ message: 'Token registrado com sucesso.' });
    } catch (error) {
      this.logger.error(
        `Falha ao registrar o token para o usuário ${userId}`,
        error,
      );
      return responseInternalServerError({
        message: 'Não foi possível registrar o token.',
      });
    }
  }

  @Cron(CronExpression.EVERY_WEEK, {
    name: 'notifyFavoritePriceChanges',
    timeZone: 'America/Sao_Paulo',
  })
  async checkForPriceChangesAndNotify() {
    this.logger.log('CRON: Iniciando verificação de preços de favoritos...');

    const allFavorites = await this.favoritesRepo.findAllWithRelations();
    if (allFavorites.length === 0) {
      this.logger.log('CRON: Nenhum favorito encontrado para processar.');
      return;
    }

    for (const favorite of allFavorites) {
      const { user, station, product } = favorite;
      if (!user || !station || !product) continue; // Pula se algum dado estiver incompleto

      const [latestPrice, previousPrice] =
        await this.priceHistoryRepo.findTwoMostRecentPrices(
          station.id,
          product.id,
        );

      if (!latestPrice || !previousPrice) {
        // Não há histórico suficiente para comparar
        continue;
      }

      const trend = latestPrice.getTrend(previousPrice);
      // Notificamos apenas se houve alteração no preço
      if (trend === 'STABLE') {
        continue;
      }
      const formattedPrice = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(latestPrice.price);

      const trendText = trend === 'UP' ? 'subiu' : 'baixou';
      const body = `${product.name} no posto ${station.trade_name || station.legal_name} ${trendText} para R$ ${formattedPrice}!`;

      this.logger.log(
        `CRON: Enviando notificação para o usuário ${user.id}: ${body}`,
      );

      await this.sendToUser(user.id, {
        title: 'Alerta de Preço',
        body,
        data: {
          station_id: station.id,
          product_id: product.id,
          url: `/gas-station/${station.id}`,
        },
      });
    }

    this.logger.log('CRON: Verificação de preços de favoritos concluída.');
  }

  async handleCronSendTestNotificationToAllUsers() {
    this.logger.log('CRON JOB: Iniciando envio de notificações...');

    const allTokens = await this.pushNotificationsRepo.findAll();

    if (allTokens.length === 0) {
      this.logger.log(
        'CRON JOB: Nenhum token encontrado para enviar notificações.',
      );
      return;
    }

    const messages: ExpoPushMessage[] = [];
    for (const token of allTokens) {
      if (!Expo.isExpoPushToken(token.push_token)) {
        this.logger.error(
          `CRON JOB: Token inválido encontrado e ignorado: ${token.push_token}`,
        );
        continue;
      }
      messages.push({
        to: token.push_token,
        sound: 'default',
        title: 'Notificação de Teste Agendada',
        body: `Olá! Esta é uma mensagem de teste enviada às ${new Date().toLocaleTimeString('pt-BR')}.`,
        data: { testId: `cron-${Date.now()}` },
      });
    }

    const chunks = this.expo.chunkPushNotifications(messages);

    for (const [index, chunk] of chunks.entries()) {
      try {
        const chunkMessages = messages.slice(index * 100, (index + 1) * 100);
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        this.logger.log(`CRON JOB: Lote ${index + 1} de tickets recebido.`);
        this.handleTickets(ticketChunk, chunkMessages);
      } catch (error) {
        this.logger.error(
          `CRON JOB: Erro ao enviar o lote ${index + 1} de notificações:`,
          error,
        );
      }
    }

    this.logger.log('CRON JOB: Ciclo de envio de notificações finalizado.');
  }

  /**
   * Remove um token de push notification do banco de dados.
   */
  async removeInvalidToken(pushToken: string): Promise<void> {
    try {
      await this.pushNotificationsRepo.deleteByToken(pushToken);
      this.logger.log(`Token removido com sucesso: ${pushToken}`);
    } catch (error) {
      this.logger.error(`Falha ao remover o token: ${pushToken}`, error);
    }
  }

  /**
   * Envia notificações para todos os dispositivos de um usuário.
   * @param userId - O ID do usuário para quem a notificação será enviada.
   * @param messagePayload - O conteúdo da notificação.
   */
  async sendToUser(
    userId: string,

    messagePayload: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    },
  ): Promise<void> {
    const tokens = await this.pushNotificationsRepo.findByUserId(userId);

    if (tokens.length === 0) {
      this.logger.warn(
        `Nenhum push token encontrado para o usuário: ${userId}`,
      );
      return;
    }

    const messages: ExpoPushMessage[] = [];
    for (const token of tokens) {
      if (!Expo.isExpoPushToken(token.push_token)) {
        this.logger.error(
          `Push token inválido encontrado e ignorado: ${token.push_token}`,
        );
        continue;
      }
      messages.push({
        to: token.push_token,
        sound: 'default',
        title: messagePayload.title,
        body: messagePayload.body,
        data: messagePayload.data,
      });
    }

    const chunks = this.expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        this.logger.log(
          'Tickets recebidos para o usuário:',
          userId,
          ticketChunk,
        );

        this.handleTickets(ticketChunk, chunk);
      } catch (error) {
        this.logger.error('Erro ao enviar o chunk de notificação:', error);
      }
    }
  }

  /**
   * Processa os tickets recebidos após o envio.
   * Lida com erros imediatos (como DeviceNotRegistered) e prepara receipts para verificação posterior.
   * @param tickets O chunk de tickets retornado pela Expo.
   * @param messages O chunk de mensagens que gerou os tickets.
   */
  private async handleTickets(
    tickets: ExpoPushTicket[],
    messages: ExpoPushMessage[],
  ): Promise<void> {
    const receiptIds: string[] = [];

    tickets.forEach((ticket, i) => {
      const originalToken = messages[i].to as string;

      if (ticket.status === 'error') {
        if (ticket.details?.error === 'DeviceNotRegistered') {
          this.logger.warn(
            `Token ${originalToken} não registrado. Removendo do banco de dados.`,
          );
          this.removeInvalidToken(originalToken);
        } else {
          this.logger.error(
            `Erro no ticket para o token ${originalToken}: ${ticket.message}`,
          );
        }
      } else {
        // Se o ticket foi um sucesso, guardamos o ID para checar o receipt depois
        const successTicket = ticket as ExpoPushSuccessTicket;
        receiptIds.push(successTicket.id);
      }
    });

    if (receiptIds.length > 0) {
      // Esta parte pode ser extraída para um processo/job separado (e.g., cron job)
      // para não bloquear a resposta da requisição.
      this.handleReceiptsByIds(receiptIds);
    }
  }

  /**
   * Verifica os receipts usando seus IDs para erros de entrega.
   */
  private async handleReceiptsByIds(receiptIds: string[]): Promise<void> {
    const receiptIdChunks =
      this.expo.chunkPushNotificationReceiptIds(receiptIds);
    for (const chunk of receiptIdChunks) {
      try {
        const receipts =
          await this.expo.getPushNotificationReceiptsAsync(chunk);
        for (const receiptId in receipts) {
          const { status, details } = receipts[receiptId];
          if (status === 'error') {
            if (details?.error === 'DeviceNotRegistered') {
              // Esta verificação é uma segunda camada de segurança.
              // O ideal é associar o receiptId ao token original quando o ticket é criado.
              // Como já tratamos o erro do ticket, esta parte se torna redundante, mas é bom manter
              // para cobrir todos os casos.
              this.logger.warn(
                `Receipt com erro 'DeviceNotRegistered'. Token já deve ter sido removido.`,
              );
            } else {
              this.logger.error(`Receipt com erro: ${details?.error}`);
            }
          }
        }
      } catch (error) {
        this.logger.error('Erro ao buscar receipts:', error);
      }
    }
  }
}
