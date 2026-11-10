import { BadRequestException } from '@nestjs/common';

export function decodeMemberPhoto(value: string) {
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match || value.length > 2800000)
    throw new BadRequestException(
      'Alege o fotografie JPG, PNG sau WebP de maximum 2 MB.',
    );
  const bytes = Buffer.from(match[2], 'base64');
  const good =
    match[1] === 'image/jpeg'
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : match[1] === 'image/png'
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : bytes.toString('ascii', 0, 4) === 'RIFF' &&
          bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!good || bytes.length > 2097152)
    throw new BadRequestException('Fișierul nu este o fotografie validă.');
  return { bytes, type: match[1] };
}
