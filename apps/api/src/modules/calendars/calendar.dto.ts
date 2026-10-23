import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalendarEventDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() location?: string;
  @ApiProperty() allDay!: boolean;
  @ApiProperty({ description: 'ISO instant, or YYYY-MM-DD for all-day events' })
  start!: string;
  @ApiProperty({ description: 'Exclusive end, ISO instant or YYYY-MM-DD' })
  end!: string;
}

export class CalendarPageDto {
  @ApiProperty({ type: [CalendarEventDto] }) items!: CalendarEventDto[];
  @ApiProperty({
    example: { from: '2026-10-23T00:00:00Z', to: '2026-11-23T00:00:00Z' },
  })
  range!: { from: string; to: string };
  @ApiPropertyOptional() nextCursor?: string;
  @ApiProperty() fetchedAt!: string;
  @ApiProperty() stale!: boolean;
}
