import { Body, Controller, Post, Res, UseGuards, Req } from '@nestjs/common';
import { LocalService } from './local.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LocalSignInDto, RefreshTokenDto, LogoutDto } from './dtos/local.dto';
import { Response, Request } from 'express';
import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { AuthGuard } from '@/common/guards/auth/auth.guard';


@ApiTags('Auth - Local')
@Controller('auth/local')
export class LocalController {
  constructor(private readonly service: LocalService) {}

  @Post('sign-in')
  @ApiOperation({ summary: 'Local Sign In' })
  @OpenApiResponses([200, 400, 404, 500])
  async localSignIn(@Body() body: LocalSignInDto, @Res() res: Response) {
    const r = await this.service.localSignIn(body);
    res.status(r.statusCode).send(r);
  }

  @Post('refresh-token')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Refresh Access Token' })
  @OpenApiResponses([200, 401, 500])
  async refreshToken(@Body() body: RefreshTokenDto, @Res() res: Response) {
    const r = await this.service.refreshToken(body.refresh_token);
    res.status(r.statusCode).send(r);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout User' })
  @OpenApiResponses([200, 401, 500])
  async logout(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const r = await this.service.logout(user.user_id, user.session_id);
    res.status(r.statusCode).send(r);
  }

  @Post('validate')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate Token' })
  @OpenApiResponses([200, 401, 500])
  async validateToken(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const userData = await this.service.validateUser(user.user_id);
    
    if (!userData) {
      res.status(401).send({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'Token inválido ou usuário não encontrado'
      });
      return;
    }

    res.status(200).send({
      statusCode: 200,
      statusMessage: 'OK',
      message: 'Token válido',
      data: {
        user: userData,
        token_info: {
          user_id: user.user_id,
          role_id: user.role_id,
          session_id: user.session_id,
          issued_at: user.iat,
          expires_at: user.exp
        }
      }
    });
  }
}