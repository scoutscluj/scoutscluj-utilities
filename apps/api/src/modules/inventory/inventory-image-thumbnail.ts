import { createHash } from 'node:crypto';
import sharp from 'sharp';

export const INVENTORY_THUMBNAIL_CONTENT_TYPE = 'image/webp';
export const INVENTORY_THUMBNAIL_SIZE = 192;

const MAX_INPUT_PIXELS = 40_000_000;
const WEBP_QUALITY = 75;

export type InventoryThumbnail = {
  contentType: typeof INVENTORY_THUMBNAIL_CONTENT_TYPE;
  fileData: Buffer;
  fileSize: number;
  checksumSha256: string;
};

export const createInventoryThumbnail = async (
  originalData: Buffer,
): Promise<InventoryThumbnail> => {
  const fileData = await sharp(originalData, {
    failOn: 'error',
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .rotate()
    .resize({
      width: INVENTORY_THUMBNAIL_SIZE,
      height: INVENTORY_THUMBNAIL_SIZE,
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();

  return {
    contentType: INVENTORY_THUMBNAIL_CONTENT_TYPE,
    fileData,
    fileSize: fileData.length,
    checksumSha256: createHash('sha256').update(fileData).digest('hex'),
  };
};
