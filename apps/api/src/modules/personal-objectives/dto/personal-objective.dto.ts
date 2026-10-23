import { ApiProperty } from '@nestjs/swagger';

export class CreatePersonalObjectiveDto {
  @ApiProperty({ maxLength: 200, example: 'Organizez o drumeție' })
  title!: string;

  @ApiProperty({
    maxLength: 5000,
    example: 'Pregătesc traseul și echipamentul necesar.',
  })
  description!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-11-15' })
  deadline!: string;
}

export class PersonalObjectiveDto extends CreatePersonalObjectiveDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}
