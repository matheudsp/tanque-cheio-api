import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  async sendPasswordResetCode(userEmail: string, code: string) {
    const emailBody = `
      <h1>Redefinição de Senha</h1>
      <p>Olá,</p>
      <p>Você solicitou a redefinição de sua senha. Use o código abaixo para criar uma nova senha:</p>
      <h2>${code}</h2>
      <p>Este código expira em 10 minutos.</p>
      <p>Se você não solicitou isso, pode ignorar este e-mail.</p>
    `;

    console.log('--- SIMULANDO ENVIO DE E-MAIL COM CÓDIGO ---');
    console.log(`Para: ${userEmail}`);
    console.log(`Corpo: ${emailBody}`);
    console.log('-------------------------------------------');
    return Promise.resolve();
  }
}
