import { Body, Controller, Post, Res, UseGuards, Req } from '@nestjs/common';
import { LocalService } from './local.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LocalSignInDto } from './dtos/local.dto';
import { Response, Request } from 'express';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { RoleGuard } from '@/common/guards/role/role.guard';

@ApiTags('Auth - Local')
@Controller('auth/local')
export class LocalController {
  constructor(private readonly service: LocalService) {}

  @Post('sign-in')
  @ApiOperation({ summary: 'Local Sign In' })
  @OpenApiResponses([200, 400, 404, 500])
  async localSignIn(@Body() body: LocalSignInDto, @Res() res: Response) {
    const result = await this.service.localSignIn(body);
    res.status(result.statusCode).send(result);
  }

  @Post('refresh-token')
  @UseGuards(RoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh Token' })
  @OpenApiResponses([200, 401, 500])
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const userId = req.user?.user_id;
    
    if (!userId) {
      return res.status(401).send({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Token inválido ou usuário não identificado',
      });
    }

    const result = await this.service.refreshToken(userId);
    res.status(result.statusCode).send(result);
  }
}