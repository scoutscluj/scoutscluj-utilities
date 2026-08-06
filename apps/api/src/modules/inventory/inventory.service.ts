import { createHash } from 'node:crypto';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { CurrentUser } from '../users/users.types';
import {
  CreateInventoryItemDto,
  InventoryImageDto,
  InventoryItemDto,
  InventoryItemListDto,
  UpdateInventoryItemDto,
  UploadInventoryImageDto,
} from './dto/inventory.dto';
import { InventoryItemImage } from './entities/inventory-item-image.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import { INVENTORY_OPTIONS } from './inventory-options';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

type InventorySortField =
  | 'name'
  | 'quantity'
  | 'category'
  | 'subcategory'
  | 'owner'
  | 'locationDescription'
  | 'condition'
  | 'isConsumable'
  | 'createdAt'
  | 'updatedAt';

type ListInventoryInput = {
  search?: string;
  category?: string;
  subcategory?: string;
  owner?: string;
  locationDescription?: string;
  condition?: string;
  consumable?: string;
  sort?: string;
  direction?: string;
  page?: string;
  pageSize?: string;
};

export type InventoryImageFile = {
  originalFilename: string;
  contentType: string;
  fileSize: number;
  fileData: Buffer;
};

const SORT_FIELDS = new Set<InventorySortField>([
  'name',
  'quantity',
  'category',
  'subcategory',
  'owner',
  'locationDescription',
  'condition',
  'isConsumable',
  'createdAt',
  'updatedAt',
]);

const cleanText = (value: unknown) => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  return '';
};

const cleanOptionalText = (value: unknown) => {
  const cleaned = cleanText(value);
  return cleaned ? cleaned : undefined;
};

const normalizeSearchText = (value: unknown) =>
  cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const normalizeCondition = (value: unknown) => {
  const condition = cleanText(value);
  if (!condition || normalizeSearchText(condition) === 'buna') {
    return 'Buna';
  }

  return condition;
};

const cleanFilename = (filename: unknown) => {
  const cleaned = cleanOptionalText(filename)?.replace(/[\\/]/g, '_');
  return cleaned?.slice(0, 255) || 'inventar.jpg';
};

const parseNonNegativeInteger = (
  value: unknown,
  fieldName: string,
  fallback = 0,
) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestException(
      `${fieldName} trebuie să fie un număr pozitiv.`,
    );
  }

  return parsed;
};

const parsePositiveInteger = (
  value: string | undefined,
  fieldName: string,
  fallback: number,
  max: number,
) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`${fieldName} nu este valid.`);
  }

  return Math.min(parsed, max);
};

const optional = (value: string | undefined) => value ?? null;

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly itemsRepository: EntityRepository<InventoryItem>,
    @InjectRepository(InventoryItemImage)
    private readonly imagesRepository: EntityRepository<InventoryItemImage>,
    @Inject(EntityManager)
    private readonly em: EntityManager,
    private readonly auditService: AuditService,
  ) {}

  getOptions() {
    return INVENTORY_OPTIONS;
  }

  async listItems(
    input: ListInventoryInput = {},
  ): Promise<InventoryItemListDto> {
    const page = parsePositiveInteger(input.page, 'Pagina', 1, 10_000);
    const pageSize = parsePositiveInteger(
      input.pageSize,
      'Dimensiunea paginii',
      100,
      250,
    );
    const filtered = this.sortItems(
      this.filterItems(
        await this.itemsRepository.find(
          { deletedAt: null },
          { orderBy: { name: 'asc', id: 'asc' } },
        ),
        input,
      ),
      input,
    );
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: await this.serializeItems(items),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  async getItem(itemId: number): Promise<InventoryItemDto> {
    const item = await this.getActiveItem(itemId);
    const [serialized] = await this.serializeItems([item]);
    return serialized;
  }

  async createItem(
    user: CurrentUser,
    input: CreateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    const item = this.itemsRepository.create({
      name: this.cleanRequiredName(input.name),
      quantity: parseNonNegativeInteger(input.quantity, 'Cantitatea'),
      category: optional(cleanOptionalText(input.category)),
      subcategory: optional(cleanOptionalText(input.subcategory)),
      owner: optional(cleanOptionalText(input.owner)),
      locationDescription: optional(
        cleanOptionalText(input.locationDescription),
      ),
      condition: normalizeCondition(input.condition),
      isConsumable: Boolean(input.isConsumable),
      notes: optional(cleanOptionalText(input.notes)),
      createdByUserId: user.id,
      createdByDisplayName: user.displayName,
      updatedByUserId: user.id,
      updatedByDisplayName: user.displayName,
      deletedAt: null,
    });

    this.em.persist(item);
    await this.em.flush();
    await this.recordAudit(user, 'inventory_item.created', item, {
      name: item.name,
    });

    const [serialized] = await this.serializeItems([item]);
    return serialized;
  }

  async updateItem(
    user: CurrentUser,
    itemId: number,
    input: UpdateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    const item = await this.getActiveItem(itemId);
    const changedFields: string[] = [];

    const setField = <K extends keyof InventoryItem>(
      field: K,
      value: InventoryItem[K],
    ) => {
      if (item[field] !== value) {
        item[field] = value;
        changedFields.push(String(field));
      }
    };

    if (input.name !== undefined) {
      setField('name', this.cleanRequiredName(input.name));
    }
    if (input.quantity !== undefined) {
      setField(
        'quantity',
        parseNonNegativeInteger(input.quantity, 'Cantitatea'),
      );
    }
    if (input.category !== undefined) {
      setField('category', optional(cleanOptionalText(input.category)));
    }
    if (input.subcategory !== undefined) {
      setField('subcategory', optional(cleanOptionalText(input.subcategory)));
    }
    if (input.owner !== undefined) {
      setField('owner', optional(cleanOptionalText(input.owner)));
    }
    if (input.locationDescription !== undefined) {
      setField(
        'locationDescription',
        optional(cleanOptionalText(input.locationDescription)),
      );
    }
    if (input.condition !== undefined) {
      setField('condition', normalizeCondition(input.condition));
    }
    if (input.isConsumable !== undefined) {
      setField('isConsumable', Boolean(input.isConsumable));
    }
    if (input.notes !== undefined) {
      setField('notes', optional(cleanOptionalText(input.notes)));
    }

    if (changedFields.length) {
      item.updatedByUserId = user.id;
      item.updatedByDisplayName = user.displayName;
      await this.em.flush();
      await this.recordAudit(user, 'inventory_item.updated', item, {
        changedFields,
      });
    }

    const [serialized] = await this.serializeItems([item]);
    return serialized;
  }

  async deleteItem(user: CurrentUser, itemId: number) {
    const item = await this.getActiveItem(itemId);
    item.deletedAt = new Date();
    item.updatedByUserId = user.id;
    item.updatedByDisplayName = user.displayName;
    await this.em.flush();
    await this.recordAudit(user, 'inventory_item.deleted', item, {
      name: item.name,
    });

    return { deleted: true };
  }

  async uploadImage(
    user: CurrentUser,
    itemId: number,
    input: UploadInventoryImageDto,
  ): Promise<InventoryItemDto> {
    const item = await this.getActiveItem(itemId);
    const contentType = cleanText(input.contentType).toLowerCase();
    if (!ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
      throw new BadRequestException(
        'Tipul imaginii nu este acceptat. Încarcă JPG, PNG, WEBP sau HEIC.',
      );
    }

    const fileData = this.decodeBase64Image(input.contentBase64);
    if (fileData.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        'Imaginea este prea mare. Limita actuală este 8 MB.',
      );
    }

    const checksumSha256 = createHash('sha256').update(fileData).digest('hex');
    const existing = await this.imagesRepository.findOne({
      inventoryItemId: item.id,
    });
    const image =
      existing ??
      this.imagesRepository.create({
        inventoryItemId: item.id,
        originalFilename: cleanFilename(input.fileName),
        contentType,
        fileSize: fileData.length,
        checksumSha256,
        fileData,
        uploadedByUserId: user.id,
        uploadedByDisplayName: user.displayName,
      });

    image.originalFilename = cleanFilename(input.fileName);
    image.contentType = contentType;
    image.fileSize = fileData.length;
    image.checksumSha256 = checksumSha256;
    image.fileData = fileData;
    image.uploadedByUserId = user.id;
    image.uploadedByDisplayName = user.displayName;
    item.updatedByUserId = user.id;
    item.updatedByDisplayName = user.displayName;

    this.em.persist(image);
    await this.em.flush();
    await this.recordAudit(user, 'inventory_item.image_replaced', item, {
      originalFilename: image.originalFilename,
      contentType: image.contentType,
      fileSize: image.fileSize,
      checksumSha256: image.checksumSha256,
    });

    const [serialized] = await this.serializeItems([item]);
    return serialized;
  }

  async removeImage(
    user: CurrentUser,
    itemId: number,
  ): Promise<InventoryItemDto> {
    const item = await this.getActiveItem(itemId);
    const image = await this.imagesRepository.findOne({
      inventoryItemId: item.id,
    });
    if (image) {
      this.em.remove(image);
      item.updatedByUserId = user.id;
      item.updatedByDisplayName = user.displayName;
      await this.em.flush();
      await this.recordAudit(user, 'inventory_item.image_removed', item, {
        imageId: image.id,
        originalFilename: image.originalFilename,
      });
    }

    const [serialized] = await this.serializeItems([item]);
    return serialized;
  }

  async getImageFile(itemId: number): Promise<InventoryImageFile> {
    const item = await this.getActiveItem(itemId);
    const image = await this.imagesRepository.findOne({
      inventoryItemId: item.id,
    });
    if (!image) {
      throw new NotFoundException('Imaginea obiectului nu există.');
    }

    return {
      originalFilename: image.originalFilename,
      contentType: image.contentType,
      fileSize: image.fileSize,
      fileData: image.fileData,
    };
  }

  private async getActiveItem(itemId: number) {
    const item = await this.itemsRepository.findOne({
      id: itemId,
      deletedAt: null,
    });
    if (!item) {
      throw new NotFoundException('Obiectul de inventar nu există.');
    }

    return item;
  }

  private filterItems(items: InventoryItem[], input: ListInventoryInput) {
    const search = normalizeSearchText(input.search);
    const category = cleanOptionalText(input.category);
    const subcategory = cleanOptionalText(input.subcategory);
    const owner = cleanOptionalText(input.owner);
    const locationDescription = cleanOptionalText(input.locationDescription);
    const condition = cleanOptionalText(input.condition);
    const consumable = cleanOptionalText(input.consumable);

    return items.filter((item) => {
      if (
        search &&
        ![
          item.name,
          item.category,
          item.subcategory,
          item.owner,
          item.locationDescription,
          item.condition,
          item.notes,
          item.createdByDisplayName,
        ].some((value) => normalizeSearchText(value).includes(search))
      ) {
        return false;
      }

      if (category && item.category !== category) return false;
      if (subcategory && item.subcategory !== subcategory) return false;
      if (owner && item.owner !== owner) return false;
      if (
        locationDescription &&
        item.locationDescription !== locationDescription
      ) {
        return false;
      }
      if (condition && normalizeCondition(item.condition) !== condition) {
        return false;
      }
      if (consumable === 'yes' && !item.isConsumable) return false;
      if (consumable === 'no' && item.isConsumable) return false;

      return true;
    });
  }

  private sortItems(items: InventoryItem[], input: ListInventoryInput) {
    const sort = SORT_FIELDS.has(input.sort as InventorySortField)
      ? (input.sort as InventorySortField)
      : 'name';
    const direction = input.direction === 'desc' ? -1 : 1;

    return [...items].sort((left, right) => {
      const primary = this.compareValues(left[sort], right[sort]);
      if (primary !== 0) {
        return primary * direction;
      }

      return left.id - right.id;
    });
  }

  private compareValues(left: unknown, right: unknown) {
    if (left instanceof Date || right instanceof Date) {
      return (
        (left instanceof Date ? left.getTime() : 0) -
        (right instanceof Date ? right.getTime() : 0)
      );
    }
    if (typeof left === 'number' || typeof right === 'number') {
      return Number(left ?? 0) - Number(right ?? 0);
    }
    if (typeof left === 'boolean' || typeof right === 'boolean') {
      return Number(Boolean(left)) - Number(Boolean(right));
    }

    return cleanText(left).localeCompare(cleanText(right), 'ro');
  }

  private async serializeItems(
    items: InventoryItem[],
  ): Promise<InventoryItemDto[]> {
    const images = await this.getImagesForItems(items);
    return items.map((item) => {
      const image = images.get(item.id);
      return {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        category: item.category ?? undefined,
        subcategory: item.subcategory ?? undefined,
        owner: item.owner ?? undefined,
        locationDescription: item.locationDescription ?? undefined,
        condition: item.condition ?? undefined,
        isConsumable: item.isConsumable,
        notes: item.notes ?? undefined,
        createdByUserId: item.createdByUserId ?? undefined,
        createdByDisplayName: item.createdByDisplayName ?? undefined,
        updatedByUserId: item.updatedByUserId ?? undefined,
        updatedByDisplayName: item.updatedByDisplayName ?? undefined,
        image: image ? this.serializeImage(image) : undefined,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      };
    });
  }

  private async getImagesForItems(items: InventoryItem[]) {
    const itemIds = items.map((item) => item.id);
    if (!itemIds.length) {
      return new Map<number, InventoryItemImage>();
    }

    const images = await this.imagesRepository.find({
      inventoryItemId: { $in: itemIds },
    });
    return new Map(images.map((image) => [image.inventoryItemId, image]));
  }

  private serializeImage(image: InventoryItemImage): InventoryImageDto {
    return {
      id: image.id,
      originalFilename: image.originalFilename,
      contentType: image.contentType,
      fileSize: image.fileSize,
      checksumSha256: image.checksumSha256,
      uploadedByUserId: image.uploadedByUserId ?? undefined,
      uploadedByDisplayName: image.uploadedByDisplayName ?? undefined,
      url: `/api/inventory/items/${image.inventoryItemId}/image`,
      createdAt: image.createdAt.toISOString(),
      updatedAt: image.updatedAt.toISOString(),
    };
  }

  private cleanRequiredName(value: unknown) {
    const name = cleanText(value);
    if (!name) {
      throw new BadRequestException('Numele obiectului este obligatoriu.');
    }

    return name.slice(0, 255);
  }

  private decodeBase64Image(content: unknown) {
    const encoded = cleanText(content);
    if (!encoded) {
      throw new BadRequestException('Imaginea este obligatorie.');
    }

    const decoded = Buffer.from(encoded, 'base64');
    if (
      !decoded.length ||
      decoded.toString('base64').replace(/=+$/, '') !==
        encoded.replace(/=+$/, '')
    ) {
      throw new BadRequestException('Imaginea nu a putut fi citită corect.');
    }

    return decoded;
  }

  private async recordAudit(
    user: CurrentUser,
    action: string,
    item: InventoryItem,
    metadata: Record<string, unknown>,
  ) {
    await this.auditService.record({
      actorId: user.id,
      action,
      entityType: 'inventory_item',
      entityId: item.id,
      metadata,
    });
  }
}
