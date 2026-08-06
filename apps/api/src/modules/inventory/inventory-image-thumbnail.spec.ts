import sharp from 'sharp';
import {
  createInventoryThumbnail,
  INVENTORY_THUMBNAIL_CONTENT_TYPE,
  INVENTORY_THUMBNAIL_SIZE,
} from './inventory-image-thumbnail';

describe('createInventoryThumbnail', () => {
  it.each(['jpeg', 'png', 'webp'] as const)(
    'creates a bounded WebP thumbnail from %s input',
    async (format) => {
      const pipeline = sharp({
        create: {
          width: 640,
          height: 320,
          channels: 3,
          background: '#c81e1e',
        },
      });
      const source = await pipeline[format]().toBuffer();

      const thumbnail = await createInventoryThumbnail(source);
      const metadata = await sharp(thumbnail.fileData).metadata();

      expect(thumbnail.contentType).toBe(INVENTORY_THUMBNAIL_CONTENT_TYPE);
      expect(thumbnail.fileSize).toBe(thumbnail.fileData.length);
      expect(thumbnail.checksumSha256).toHaveLength(64);
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(INVENTORY_THUMBNAIL_SIZE);
      expect(metadata.height).toBe(INVENTORY_THUMBNAIL_SIZE);
    },
  );

  it('rejects bytes that are not a decodable image', async () => {
    await expect(
      createInventoryThumbnail(Buffer.from('not-an-image')),
    ).rejects.toThrow();
  });
});
