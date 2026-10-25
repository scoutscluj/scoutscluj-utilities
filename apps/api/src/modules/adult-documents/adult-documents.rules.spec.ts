import {
  adultOn,
  decodeDocument,
  MAX_DOCUMENT_BYTES,
  parseKind,
  parseYear,
  scoutingYear,
  summarizeDocuments,
} from './adult-documents.rules';

describe('adult document rules', () => {
  it('uses Bucharest birthdays and September scouting-year boundaries', () => {
    expect(adultOn('2008-10-25', new Date('2026-10-24T21:30:00Z'))).toBe(true);
    expect(adultOn('2008-10-25', new Date('2026-10-24T20:30:00Z'))).toBe(false);
    expect(scoutingYear(new Date('2026-08-31T21:30:00Z'))).toBe(2026);
    expect(scoutingYear(new Date('2026-08-31T20:30:00Z'))).toBe(2025);
    expect(adultOn(null)).toBeNull();
    expect(adultOn('2000-02-31')).toBeNull();
    expect(adultOn('invalid')).toBeNull();
  });

  it('does not infer age from a role and handles leap-day birthdays consistently', () => {
    expect(adultOn('2008-02-29', new Date('2026-02-28T12:00:00Z'))).toBe(false);
    expect(adultOn('2008-02-29', new Date('2026-03-01T12:00:00Z'))).toBe(true);
    expect(adultOn('2010-10-25', new Date('2026-10-25T12:00:00Z'))).toBe(false);
  });

  it('requires the current CIC version to be validated', () => {
    expect(summarizeDocuments([])).toEqual(['missing']);
    expect(
      summarizeDocuments([
        { kind: 'behavioural_integrity', version: 1, status: 'validated' },
        { kind: 'behavioural_integrity', version: 2, status: 'pending' },
      ]),
    ).toEqual(['pending']);
    expect(() => parseKind('criminal_record')).toThrow();
  });

  it('rejects invalid kinds, years, malformed base64, spoofed types and oversized files', () => {
    expect(() => parseKind('passport')).toThrow();
    expect(() => parseYear('2026-2027')).toThrow();
    expect(() => parseYear('1999')).toThrow();
    expect(() => parseYear(String(scoutingYear() + 1))).toThrow();
    expect(parseYear('2025')).toBe(2025);
    const valid = {
      filename: 'certificat.pdf',
      contentType: 'application/pdf',
      contentBase64: Buffer.from('%PDF-1.7\noriginal').toString('base64'),
    };
    expect(decodeDocument(valid).data.toString()).toBe('%PDF-1.7\noriginal');
    expect(() => decodeDocument({ ...valid, contentBase64: '!!!!' })).toThrow();
    expect(() =>
      decodeDocument({
        ...valid,
        contentBase64: Buffer.from('<html>not a PDF</html>').toString('base64'),
      }),
    ).toThrow();
    expect(() =>
      decodeDocument({ ...valid, contentType: 'image/png' }),
    ).toThrow();
    expect(() =>
      decodeDocument({
        ...valid,
        contentBase64: Buffer.alloc(MAX_DOCUMENT_BYTES + 1).toString('base64'),
      }),
    ).toThrow();
    expect(
      decodeDocument({ ...valid, filename: '../certificat\r\n.pdf' }).filename,
    ).toBe('certificat.pdf');
  });
});
