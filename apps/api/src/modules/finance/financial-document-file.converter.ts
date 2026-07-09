import { BadRequestException } from '@nestjs/common';
import { PDFDocument, rgb } from 'pdf-lib';
import sharp from 'sharp';

export const FINANCIAL_DOCUMENT_PDF_CONTENT_TYPE = 'application/pdf';

const IMAGE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export const ALLOWED_FINANCIAL_DOCUMENT_CONTENT_TYPES = new Set([
  FINANCIAL_DOCUMENT_PDF_CONTENT_TYPE,
  ...IMAGE_CONTENT_TYPES,
]);

const A4_PORTRAIT_POINTS = {
  width: 595.28,
  height: 841.89,
};
const PAGE_MARGIN_POINTS = 28.35;
const MAX_IMAGE_EDGE_PIXELS = 3508;
const JPEG_QUALITY = 85;

export type PreparedFinancialDocumentFile = {
  originalFilename: string;
  contentType: string;
  fileData: Buffer;
  convertedFromContentType?: string;
};

type PrepareFinancialDocumentFileInput = {
  originalFilename: string;
  contentType: string;
  fileData: Buffer;
};

export const isFinancialDocumentImageContentType = (contentType: string) =>
  IMAGE_CONTENT_TYPES.has(contentType.toLowerCase());

export const prepareFinancialDocumentFile = async (
  input: PrepareFinancialDocumentFileInput,
): Promise<PreparedFinancialDocumentFile> => {
  const contentType = input.contentType.toLowerCase();
  if (contentType === FINANCIAL_DOCUMENT_PDF_CONTENT_TYPE) {
    return {
      originalFilename: ensurePdfFilename(input.originalFilename),
      contentType: FINANCIAL_DOCUMENT_PDF_CONTENT_TYPE,
      fileData: input.fileData,
    };
  }

  if (!isFinancialDocumentImageContentType(contentType)) {
    throw new BadRequestException(
      'Tipul fișierului nu este acceptat. Încarcă PDF, JPG, PNG, WEBP sau HEIC.',
    );
  }

  return {
    originalFilename: ensurePdfFilename(input.originalFilename),
    contentType: FINANCIAL_DOCUMENT_PDF_CONTENT_TYPE,
    fileData: await imageToPdf(input.fileData),
    convertedFromContentType: contentType,
  };
};

const ensurePdfFilename = (filename: string) => {
  const withoutExtension =
    filename.replace(/\.[^./\\]+$/, '').trim() || 'document-financiar';
  return `${withoutExtension.slice(0, 251)}.pdf`;
};

const imageToPdf = async (fileData: Buffer) => {
  try {
    const normalizedImage = await sharp(fileData)
      .rotate()
      .resize({
        width: MAX_IMAGE_EDGE_PIXELS,
        height: MAX_IMAGE_EDGE_PIXELS,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    const imageMetadata = await sharp(normalizedImage).metadata();
    if (!imageMetadata.width || !imageMetadata.height) {
      throw new Error('Missing normalized image dimensions.');
    }

    const pdf = await PDFDocument.create();
    pdf.setCreator('Resurse Scouts Cluj');
    pdf.setProducer('Resurse Scouts Cluj');
    pdf.setCreationDate(new Date(0));
    pdf.setModificationDate(new Date(0));

    const embeddedImage = await pdf.embedJpg(normalizedImage);
    const pageSize = pageSizeForImage(
      imageMetadata.width,
      imageMetadata.height,
    );
    const page = pdf.addPage([pageSize.width, pageSize.height]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageSize.width,
      height: pageSize.height,
      color: rgb(1, 1, 1),
    });

    const maxWidth = pageSize.width - PAGE_MARGIN_POINTS * 2;
    const maxHeight = pageSize.height - PAGE_MARGIN_POINTS * 2;
    const scale = Math.min(
      maxWidth / embeddedImage.width,
      maxHeight / embeddedImage.height,
    );
    const width = embeddedImage.width * scale;
    const height = embeddedImage.height * scale;
    page.drawImage(embeddedImage, {
      x: (pageSize.width - width) / 2,
      y: (pageSize.height - height) / 2,
      width,
      height,
    });

    const pdfBytes = await pdf.save({ useObjectStreams: false });
    return Buffer.from(pdfBytes);
  } catch {
    throw new BadRequestException(
      'Imaginea încărcată nu a putut fi transformată în PDF. Încearcă o poză JPG, PNG, WEBP sau HEIC mai clară.',
    );
  }
};

const pageSizeForImage = (width: number, height: number) =>
  width > height
    ? {
        width: A4_PORTRAIT_POINTS.height,
        height: A4_PORTRAIT_POINTS.width,
      }
    : A4_PORTRAIT_POINTS;
