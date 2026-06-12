import { ApiProperty } from '@nestjs/swagger';
import { CurrentUserDto } from './current-user.dto';

export class OrgoSignInResponseDto {
  @ApiProperty()
  session_token!: string;

  @ApiProperty({ type: CurrentUserDto })
  user!: CurrentUserDto;

  @ApiProperty({ type: Object })
  orgo_profile!: Record<string, unknown>;

  @ApiProperty()
  was_created!: boolean;
}
