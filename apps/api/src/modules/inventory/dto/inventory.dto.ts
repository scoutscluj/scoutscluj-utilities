import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryOptionDto {
  @ApiProperty()
  value!: string;

  @ApiProperty()
  label!: string;
}

export class InventoryCategoryOptionDto extends InventoryOptionDto {
  @ApiProperty({ type: [InventoryOptionDto] })
  subcategories!: InventoryOptionDto[];
}

export class InventoryOptionsDto {
  @ApiProperty({ type: [InventoryCategoryOptionDto] })
  categories!: InventoryCategoryOptionDto[];

  @ApiProperty({ type: [InventoryOptionDto] })
  owners!: InventoryOptionDto[];

  @ApiProperty({ type: [InventoryOptionDto] })
  locations!: InventoryOptionDto[];

  @ApiProperty({ type: [InventoryOptionDto] })
  conditions!: InventoryOptionDto[];
}

export class InventoryImageDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  originalFilename!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  fileSize!: number;

  @ApiProperty()
  checksumSha256!: string;

  @ApiPropertyOptional()
  uploadedByUserId?: number;

  @ApiPropertyOptional()
  uploadedByDisplayName?: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class InventoryItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  quantity!: number;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional()
  subcategory?: string;

  @ApiPropertyOptional()
  owner?: string;

  @ApiPropertyOptional()
  locationDescription?: string;

  @ApiPropertyOptional()
  condition?: string;

  @ApiProperty()
  isConsumable!: boolean;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  createdByUserId?: number;

  @ApiPropertyOptional()
  createdByDisplayName?: string;

  @ApiPropertyOptional()
  updatedByUserId?: number;

  @ApiPropertyOptional()
  updatedByDisplayName?: string;

  @ApiPropertyOptional({ type: InventoryImageDto })
  image?: InventoryImageDto;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class InventoryItemListDto {
  @ApiProperty({ type: [InventoryItemDto] })
  items!: InventoryItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'Cort patrulă' })
  name!: string;

  @ApiPropertyOptional({ example: 2 })
  quantity?: number;

  @ApiPropertyOptional({ example: 'Camp' })
  category?: string;

  @ApiPropertyOptional({ example: 'Corturi' })
  subcategory?: string;

  @ApiPropertyOptional({ example: 'Comun' })
  owner?: string;

  @ApiPropertyOptional({ example: 'Pod - Camp' })
  locationDescription?: string;

  @ApiPropertyOptional({ example: 'Buna' })
  condition?: string;

  @ApiPropertyOptional({ example: false })
  isConsumable?: boolean;

  @ApiPropertyOptional({ example: 'Verificat la început de sezon.' })
  notes?: string;
}

export class UpdateInventoryItemDto {
  @ApiPropertyOptional({ example: 'Cort patrulă' })
  name?: string;

  @ApiPropertyOptional({ example: 2 })
  quantity?: number;

  @ApiPropertyOptional({ example: 'Camp' })
  category?: string;

  @ApiPropertyOptional({ example: 'Corturi' })
  subcategory?: string;

  @ApiPropertyOptional({ example: 'Comun' })
  owner?: string;

  @ApiPropertyOptional({ example: 'Pod - Camp' })
  locationDescription?: string;

  @ApiPropertyOptional({ example: 'Buna' })
  condition?: string;

  @ApiPropertyOptional({ example: false })
  isConsumable?: boolean;

  @ApiPropertyOptional({ example: 'Verificat la început de sezon.' })
  notes?: string;
}

export class UploadInventoryImageDto {
  @ApiProperty({ example: 'cort.jpg' })
  fileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  contentType!: string;

  @ApiProperty({
    description: 'Base64 encoded image content.',
  })
  contentBase64!: string;
}
