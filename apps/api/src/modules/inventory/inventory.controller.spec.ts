jest.mock('../auth/guards/auth.guard', () => ({
  AuthGuard: class AuthGuard {},
}));

jest.mock('../auth/guards/roles.guard', () => ({
  RolesGuard: class RolesGuard {},
}));

jest.mock('./inventory.service', () => ({
  InventoryService: class InventoryService {},
}));

import type { Response } from 'express';
import { InventoryController } from './inventory.controller';
import type { InventoryService } from './inventory.service';

const imageFile = {
  originalFilename: 'cort.jpg',
  contentType: 'image/jpeg',
  fileSize: 4,
  checksumSha256: 'checksum',
  fileData: Buffer.from('test'),
};

const createResponse = () => {
  const response = {
    setHeader: jest.fn(),
    status: jest.fn(),
    end: jest.fn(),
    send: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
};

describe('InventoryController image delivery', () => {
  it('returns 304 for an unchanged original image', async () => {
    const service = {
      getImageFile: jest.fn().mockResolvedValue(imageFile),
    };
    const controller = new InventoryController(
      service as unknown as InventoryService,
    );
    const response = createResponse();

    await controller.getImage(1, '"checksum"', response as unknown as Response);

    expect(response.setHeader).toHaveBeenCalledWith('ETag', '"checksum"');
    expect(response.status).toHaveBeenCalledWith(304);
    expect(response.send).not.toHaveBeenCalled();
  });

  it('sends a protected thumbnail with validators', async () => {
    const service = {
      getThumbnailFile: jest.fn().mockResolvedValue({
        ...imageFile,
        originalFilename: 'cort.webp',
        contentType: 'image/webp',
      }),
    };
    const controller = new InventoryController(
      service as unknown as InventoryService,
    );
    const response = createResponse();

    await controller.getThumbnail(
      1,
      undefined,
      response as unknown as Response,
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, max-age=300',
    );
    expect(response.send).toHaveBeenCalledWith(imageFile.fileData);
  });
});
