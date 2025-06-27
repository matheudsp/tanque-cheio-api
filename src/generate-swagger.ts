import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function generateSwaggerSpec() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Tanque Cheio API')
    .setDescription('Documentação completa da API Tanque Cheio.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  const outputPath = path.resolve(process.cwd(), 'docs/swagger.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`Swagger JSON gerado com sucesso em: ${outputPath}`);
  await app.close();
}

generateSwaggerSpec();