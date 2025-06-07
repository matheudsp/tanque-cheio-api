import { PermissionQueryDto, PermissionsCreateDto } from './dtos/permissions.dto';
import {
  ResponseApi,
  responseBadRequest,
  responseCreated,
  responseInternalServerError,
  responseNotFound,
  responseOk,
} from '@/common/utils/response-api';
import { Meta, metaPagination, zodErrorParse } from '@/common/utils/lib';
import {
  permissionsCreateSchema,
  permissionsQuerySchema,
} from './schemas/permissions.schema';

import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { PermissionsRepository } from './repositories/permissions.repository';
import { ResourceRepository } from '../resources/repositories/resources.repository';
import { RolesRepository } from '../roles/repositories/roles.repository';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheRequestService } from '@/common/services/cache-request/cache-request.service';
import { seconds } from '@nestjs/throttler';
import { PermissionsEntity, Action } from '@/database/entity/permissions.entity';

type CachePermissions = {
  permissions: PermissionsEntity[];
  meta: Meta;
};

interface Permission {
  methods: Action[];
  path: string;
}

@Injectable()
export class PermissionsService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly cacheKey: CacheRequestService,
    private readonly repo: PermissionsRepository,
    private readonly roleRepo: RolesRepository,
    private readonly resourceRepo: ResourceRepository,
  ) {}


  async index(query: PermissionQueryDto) {
    try {
      const parsed = permissionsQuerySchema.parse(query);
      const cacheKey = this.cacheKey.getCacheKey();
      const cacheData = await this.cache.get<CachePermissions>(cacheKey);
      if (cacheData) return responseOk({ data: cacheData });
      const { data: permissions, total } = await this.repo.findAll(parsed);
      const meta = metaPagination({
        page: parsed.page,
        limit: parsed.limit,
        total,
      });
      await this.cache.set(cacheKey, { permissions, meta }, seconds(30));
      return responseOk({ data: { permissions, meta } });
    } catch (error) {
      const zodErr = zodErrorParse(error);
      if (zodErr.isError) return responseBadRequest({ error: zodErr.errors });
      return responseInternalServerError({
        message: error.message || 'Internal Server Error',
      });
    }
  }

  async store(data: PermissionsCreateDto) {
    try {
      const parsed = permissionsCreateSchema.parse(data);
      const [role, resource] = await Promise.all([
        this.roleRepo.findById(parsed.role_id),
        this.resourceRepo.findById(parsed.resource_id),
      ]);
      if (!role) return responseNotFound({ message: 'Role not found' });
      if (!resource) return responseNotFound({ message: 'Resource not found' });
      const permission = await this.repo.store(parsed);
      return responseCreated({ data: permission });
    } catch (error) {
      const zodErr = zodErrorParse(error);
      if (zodErr.isError) return responseBadRequest({ error: zodErr.errors });
      return responseInternalServerError({
        message: error.message || 'Internal Server Error',
      });
    }
  }

  async show(id: string): Promise<ResponseApi> {
    try {
      const cacheKey = this.cacheKey.getCacheKey();
      let data = await this.cache.get<PermissionsCreateDto>(cacheKey);
      if (data) return responseOk({ data });
      data = await this.repo.findById(id);
      if (!data) return responseNotFound({ message: 'Permission Not Found' });
      await this.cache.set(cacheKey, data, seconds(30));
      return responseOk({ data });
    } catch (error) {
      return responseInternalServerError({
        message: error.message || 'Internal Server Error',
      });
    }
  }

  async update(id: string, data: PermissionsCreateDto) {
    try {
      const parsed = permissionsCreateSchema.parse(data);
      const [permission, role, resource] = await Promise.all([
        this.repo.findById(id),
        this.roleRepo.findById(parsed.role_id),
        this.resourceRepo.findById(parsed.resource_id),
      ]);
      if (!permission)
        return responseNotFound({ message: 'Permission Not Found' });
      if (!role) return responseNotFound({ message: 'Role not found' });
      if (!resource) return responseNotFound({ message: 'Resource not found' });
      const updated = await this.repo.update(id, parsed);
      return responseOk({ data: updated });
    } catch (error) {
      const zodErr = zodErrorParse(error);
      if (zodErr.isError) return responseBadRequest({ error: zodErr.errors });
      return responseInternalServerError({
        message: error.message || 'Internal Server Error',
      });
    }
  }

  async destroy(id: string) {
    try {
      const permission = await this.repo.findById(id);
      if (!permission)
        return responseNotFound({ message: 'Permission Not Found' });
      await this.repo.destroy(id);
      return responseOk({ message: 'Permission Deleted' });
    } catch (error) {
      return responseInternalServerError({
        message: error.message || 'Internal Server Error',
      });
    }
  }

  // ========== MÉTODOS DE VALIDAÇÃO DE PERMISSÕES ==========

  // Valida se uma role possui permissão para acessar um recurso específico
   
  async validatePermissions(
    roleId: string,
    requestPath: string,
    requestMethod: string,
  ): Promise<void> {
    const permissions = await this.getPermissionsByRole(roleId);
    
    if (!permissions.length) {
      throw new ForbiddenException('Nenhuma permissão encontrada para este usuário');
    }

    // Verifica permissão global ALL primeiro
    if (this.hasGlobalPermission(permissions)) {
      return;
    }

    const hasAccess = this.checkPermissionMatch(permissions, requestPath, requestMethod);
    
    if (!hasAccess) {
      throw new ForbiddenException(`Acesso negado para ${requestMethod} ${requestPath}`);
    }
  }

  // Resolve a rota removendo versioning e query parameters
  resolveRoute(rawUrl: string, rawMethod: string): { path: string; method: string } {
    const method = rawMethod.toUpperCase();
    const cleanUrl = this.sanitizeUrl(rawUrl);
    const endpoint = this.extractEndpointFromUrl(cleanUrl);

    return { path: endpoint.toLowerCase(), method };
  }

  // ========== MÉTODOS PRIVADOS DE VALIDAÇÃO ==========

  // Busca permissões por role e transforma em formato padronizado
  private async getPermissionsByRole(roleId: string): Promise<Permission[]> {
    const rawPerms = await this.repo.findByRoleId(roleId);
    
    return rawPerms.map((p) => ({
      methods: Array.isArray(p.action) ? p.action : [p.action],
      path: (p.resource?.path || '').toLowerCase(),
    }));
  }

  //  Verifica se há permissão global ALL
  private hasGlobalPermission(permissions: Permission[]): boolean {
    return permissions.some(
      (p) => p.methods.includes(Action.ALL) && p.path === '*'
    );
  }

  // Verifica se alguma permissão corresponde à requisição
  private checkPermissionMatch(
    permissions: Permission[],
    requestPath: string,
    requestMethod: string,
  ): boolean {
    return permissions.some(({ methods, path }) => {
      return (
        this.hasMethodPermission(methods, requestMethod) &&
        this.hasPathPermission(path, requestPath)
      );
    });
  }

  // Verifica se o método está autorizado
  private hasMethodPermission(methods: Action[], requestMethod: string): boolean {
    return methods.includes(requestMethod as Action) || methods.includes(Action.ALL);
  }

  // Verifica se o path está autorizado
  private hasPathPermission(permissionPath: string, requestPath: string): boolean {
    if (permissionPath === '*') {
      return true;
    }

    const permNorm = this.normalizePath(permissionPath);
    const reqNorm = this.normalizePath(requestPath);

    // Correspondência exata
    if (permNorm === reqNorm) {
      return true;
    }

    // Correspondência hierárquica (subpaths)
    if (reqNorm.startsWith(permNorm + '/')) {
      return true;
    }

    // Correspondência por segmentos
    const segments = reqNorm.split('/');
    return segments.includes(permNorm);
  }

  // Sanitiza URL removendo caracteres perigosos
   
  private sanitizeUrl(url: string): string {
    return url.replace(/\.\./g, '').replace(/\/+/g, '/');
  }

  // Extrai endpoint da URL removendo versioning
   
  private extractEndpointFromUrl(cleanUrl: string): string {
    const versionMatch = cleanUrl.match(/\/api\/v\d+\//);
    
    if (!versionMatch) {
      throw new ForbiddenException('Formato de URL inválido');
    }

    const afterVersion = cleanUrl.split(versionMatch[0])[1] || '';
    let endpoint = afterVersion.split('?')[0];
    endpoint = `/${endpoint}`.replace(/\/+$/, '') || '/';

    return endpoint;
  }

  // Normaliza path removendo barras extras
  private normalizePath(path: string): string {
    return path.replace(/^\/+|\/+$/g, '');
  }
}