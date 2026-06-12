import { ApiProperty } from '@nestjs/swagger';

export class OrgoRequestTokenResponseDto {
  @ApiProperty()
  request_token!: string;

  @ApiProperty()
  redirect_url!: string;
}
