import { Body, Controller, Post, Res, UseGuards, Req } from '@nestjs/common';
import { LocalService } from './local.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  LocalSignInDto,
  RefreshTokenDto,
  LocalSignUpDto,
  type ForgotPasswordDto,
  type ResetPasswordDto,
} from './dtos/local.dto';
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
    const r = await this.service.signIn(body);
    res.status(r.statusCode).send(r);
  }

  @Post('sign-up')
  @ApiOperation({ summary: 'Register a new guest' })
  @OpenApiResponses([200, 400, 409, 500])
  async signUp(@Body() body: LocalSignUpDto, @Res() res: Response) {
    const r = await this.service.signUp(body);
    return res.status(r.statusCode).send(r);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar código de redefinição de senha' })
  @OpenApiResponses([200, 400, 500])
  async forgotPassword(@Body() body: ForgotPasswordDto, @Res() res: Response) {
    const r = await this.service.forgotPassword(body);
    return res.status(r.statusCode).send(r);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Redefinir a senha com o código' })
  @OpenApiResponses([200, 400, 500])
  async resetPassword(@Body() body: ResetPasswordDto, @Res() res: Response) {
    const r = await this.service.resetPassword(body);
    return res.status(r.statusCode).send(r);
  }

  @Post('refresh-token')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Refresh Access Token' })
  @OpenApiResponses([200, 401, 500])
  async refreshToken(@Body() body: RefreshTokenDto, @Res() res: Response) {
    const r = await this.service.refreshToken(body.refresh_token);
    res.status(r.statusCode).send(r);
  }
}
