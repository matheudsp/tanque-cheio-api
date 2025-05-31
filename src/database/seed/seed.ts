import { AppDataSource } from '../../config/database';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { seedUsersFactory } from './users-factory.seed';


AppDataSource.initialize()
  .then(async (dataSource: DataSource) => {
    const logger = new Logger('Seed');
    logger.log('Seeding started...');
    await Promise.all([seedUsersFactory(dataSource)]);
    // await seedGasStations(dataSource);

    logger.log('Seeding completed');
  })
  .catch((error) => {
    console.log('Error during Data Source initialization', error);
  })
  .finally(async () => {
    await AppDataSource.destroy();
    process.exit(0);
  });