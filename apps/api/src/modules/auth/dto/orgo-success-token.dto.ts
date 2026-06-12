import { ApiProperty } from '@nestjs/swagger';

export class OrgoSuccessTokenDto {
  @ApiProperty()
  successToken!: string;
}
