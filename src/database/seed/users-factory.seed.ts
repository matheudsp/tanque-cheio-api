import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

import { Action, PermissionsEntity } from '../entity/permissions.entity';

import { DataSource } from 'typeorm';
import { HasRolesEntity } from '../entity/has-roles.entity';
import { Logger } from '@nestjs/common';
import { ResourceEntity } from '../entity/resources.entity';
import { RolesEntity } from '../entity/roles.entity';
import { UserEntity } from '../entity/user.entity';
import { v7 as uuid } from 'uuid';

dotenv.config();
export const seedUsersFactory = async (db: DataSource) => {
  const logger = new Logger('SeedUserFactory');
  await db.transaction(async (manager) => {
    const userRepo = manager.getRepository(UserEntity);
    const rolesRepo = manager.getRepository(RolesEntity);
    const permissionsRepo = manager.getRepository(PermissionsEntity);
    const hasRoleRepo = manager.getRepository(HasRolesEntity);
    const resourceRepo = manager.getRepository(ResourceEntity);

    // users
    const users: UserEntity[] = [
      {
        id: uuid(),
        name: process.env.SEEDER_NAME_ADMIN as string || 'Admin',
        email: process.env.SEEDER_EMAIL_ADMIN as string || 'admin@mail.com',
        password: bcrypt.hashSync(
          process.env.SEEDER_PASSWORD_ADMIN as string || 'password123',
          parseInt(process.env.SALT_ROUNDS as string) || 12,
        ),
      },
      {
        id: uuid(),
        name: process.env.SEEDER_NAME_USER as string || 'Guest',
        email: process.env.SEEDER_EMAIL_USER as string || 'Guest@mail.com',
        password: bcrypt.hashSync(
          process.env.SEEDER_PASSWORD_USER || 'password123',
          parseInt(process.env.SALT_ROUNDS as string) || 12,
        ),
      },
    ];
    // roles
    const roles: RolesEntity[] = [
      {
        id: uuid(),
        code: 'admin',
        name: 'Admin',
      },
      {
        id: uuid(),
        code: 'guest',
        name: 'Guest',
      },
    ];
    // permissions
    const resources: ResourceEntity[] = [
      // ALL PERMISSIONS
      {
        id: uuid(),
        name: 'All Resources',
        path: '*',
        created_at: new Date(),
        updated_at: new Date(),
      },
      // ADMIN PERMISSIONS
      {
        id: uuid(),
        name: 'Data Upload',
        path: 'data-sync',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        name: 'Localization Geocode',
        path: 'localizations',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        name: 'Has Roles Management',
        path: 'has-roles',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        name: 'Permissions Management',
        path: 'permissions',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        name: 'Resources Management',
        path: 'resources',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        name: 'Roles Management',
        path: 'roles',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        name: 'Users Management',
        path: 'users',
        created_at: new Date(),
        updated_at: new Date(),
      },

      // GUEST PERMISSIONS
      {
        id: uuid(),
        name: 'Gas Stations',
        path: 'gas-stations',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        name: 'Price History',
        path: 'price-history',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        name: 'Product Management',
        path: 'products',
        created_at: new Date(),
        updated_at: new Date(),
      }
    ];
    const hasRoles: HasRolesEntity[] = [
      // Admin user
      {
        id: uuid(),
        user_id: users[0].id,
        role_id: roles[0].id,
      },
      // Guest user
      {
        id: uuid(),
        user_id: users[1].id, // Guest
        role_id: roles[1].id, // guest role
      },
    ];

    const permissions: PermissionsEntity[] = [
      // ADMIN PERMISSIONS
      {
        id: uuid(),
        action: ['ALL'] as Action[],
        resource_id: resources[0].id, // All resources /*
        role_id: roles[0].id, //admin role
      },
      {
        id: uuid(),
        action: [Action.GET],
        resource_id: resources[8].id, // Gas Stations
        role_id: roles[1].id, // guest role
      },
      {
        id: uuid(),
        action: [Action.GET],
        resource_id: resources[9].id, // Price History
        role_id: roles[1].id, // guest role
      },
      {
        id: uuid(),
        action: [Action.GET],
        resource_id: resources[10].id, // Product
        role_id: roles[1].id, // guest role
      },
      // {
      //   id: uuid(),
      //   action: [Action.GET],
      //   resource_id: resources[11].id, // Health
      //   role_id: roles[1].id, // guest role
      // },
    ];

    try {
      await userRepo.save(users);
      logger.log('✅ Users seeded');
      await rolesRepo.save(roles);
      logger.log('✅ Roles seeded');
      await resourceRepo.save(resources);
      logger.log('✅ Resources seeded');
      await hasRoleRepo.save(hasRoles);
      logger.log('✅ HasRoles seeded');
      await permissionsRepo.save(permissions);
      logger.log('✅ Permissions seeded');
    } catch (error) {
      logger.error('❌ Error seeding data', error);
      throw error;
    }
  });
};
