import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser as CurrentUserDecorator } from './decorators/current-user.decorator';
import { CurrentUserDto } from './dto/current-user.dto';
import { LogoutDto } from './dto/logout.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { OrgoRequestTokenResponseDto } from './dto/orgo-request-token-response.dto';
import { OrgoSignInResponseDto } from './dto/orgo-sign-in-response.dto';
import { OrgoSuccessTokenDto } from './dto/orgo-success-token.dto';
import { AuthGuard } from './guards/auth.guard';
import type { AuthenticatedUser } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('orgo/request-token')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: OrgoRequestTokenResponseDto })
  async requestOrgoToken(): Promise<OrgoRequestTokenResponseDto> {
    const response = await this.authService.requestOrgoLogin();

    return {
      request_token: response.requestToken,
      redirect_url: response.redirectUrl,
    };
  }

  @Post('orgo/signin')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: OrgoSignInResponseDto })
  signInWithOrgo(
    @Body() body: OrgoSuccessTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.signInWithOrgo(body.successToken, response);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  @ApiOkResponse({ type: CurrentUserDto })
  getCurrentUser(@CurrentUserDecorator() user: AuthenticatedUser) {
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(
    @Body() body: LogoutDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logout(body.successToken, response);
  }
}
