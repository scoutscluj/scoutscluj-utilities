import { BadRequestException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import {
  FINANCIAL_DOCUMENT_PDF_CONTENT_TYPE,
  prepareFinancialDocumentFile,
} from './financial-document-file.converter';

const createPng = () =>
  sharp({
    create: {
      width: 120,
      height: 80,
      channels: 3,
      background: '#ffffff',
    },
  })
    .png()
    .toBuffer();

describe('prepareFinancialDocumentFile', () => {
  it('converts uploaded images into a single-page PDF document', async () => {
    const prepared = await prepareFinancialDocumentFile({
      originalFilename: 'bon-magazin.jpeg',
      contentType: 'image/jpeg',
      fileData: await createPng(),
    });

    expect(prepared.originalFilename).toBe('bon-magazin.pdf');
    expect(prepared.contentType).toBe(FINANCIAL_DOCUMENT_PDF_CONTENT_TYPE);
    expect(prepared.convertedFromContentType).toBe('image/jpeg');
    expect(prepared.fileData.subarray(0, 5).toString('utf8')).toBe('%PDF-');

    const pdf = await PDFDocument.load(prepared.fileData);
    expect(pdf.getPageCount()).toBe(1);
  });

  it('keeps PDF bytes while normalizing the filename extension', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const fileData = Buffer.from(await pdf.save());

    const prepared = await prepareFinancialDocumentFile({
      originalFilename: 'factura-fara-extensie',
      contentType: 'application/pdf',
      fileData,
    });

    expect(prepared.originalFilename).toBe('factura-fara-extensie.pdf');
    expect(prepared.contentType).toBe(FINANCIAL_DOCUMENT_PDF_CONTENT_TYPE);
    expect(prepared.convertedFromContentType).toBeUndefined();
    expect(prepared.fileData).toBe(fileData);
  });

  it('rejects corrupted image uploads', async () => {
    await expect(
      prepareFinancialDocumentFile({
        originalFilename: 'bon.jpg',
        contentType: 'image/jpeg',
        fileData: Buffer.from('not an image'),
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
