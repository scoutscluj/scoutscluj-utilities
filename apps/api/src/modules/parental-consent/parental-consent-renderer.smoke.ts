import {
  createRepresentativeOrganizerDraft,
  defaultLayoutSettings,
  initialTemplateDocument,
  type FormField,
  type TemplateDocument,
} from '@scouts-cluj/parental-consent-schema';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ParentalConsentRendererService } from './parental-consent-renderer.service';

const extraFields: FormField[] = [
  { code: 'birth_date', type: 'date', label: 'Data nașterii' },
  { code: 'participant_age', type: 'number', label: 'Vârsta' },
  { code: 'guardian_email', type: 'email', label: 'E-mail părinte/tutore' },
  { code: 'can_swim', type: 'yes_no', label: 'Participantul știe să înoate?' },
  {
    code: 'pickup_person',
    type: 'single_choice',
    label: 'Persoana care preia participantul',
    options: [
      { value: 'guardian', label: 'Părinte/tutore' },
      { value: 'delegate', label: 'Persoană delegată' },
    ],
  },
  {
    code: 'permissions',
    type: 'multiple_choice',
    label: 'Confirmări',
    options: [
      { value: 'photos', label: 'Fotografii' },
      { value: 'transport', label: 'Transport organizat' },
    ],
  },
  {
    code: 'preferred_contact',
    type: 'dropdown',
    label: 'Canal de contact preferat',
    options: [
      { value: 'phone', label: 'Telefon' },
      { value: 'email', label: 'E-mail' },
    ],
  },
  {
    code: 'medication_rows',
    type: 'repeating_group',
    label: 'Medicamente predate responsabilului',
    children: [
      { code: 'medication_name', type: 'short_text', label: 'Denumire' },
      {
        code: 'medication_instructions',
        type: 'short_text',
        label: 'Instrucțiuni scrise',
      },
    ],
  },
  {
    code: 'privacy_note',
    type: 'read_only',
    label: 'Datele se completează numai pe formularul tipărit.',
  },
];

const fixtureDocument: TemplateDocument = {
  ...initialTemplateDocument,
  content: [
    ...initialTemplateDocument.content,
    {
      type: 'callout',
      tone: 'important',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Fixture de verificare: Ț, Ș, Ă, Â, Î și text suficient pentru paginare.',
            },
          ],
        },
      ],
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Element' }],
                },
              ],
            },
            {
              type: 'tableCell',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Detalii' }],
                },
              ],
            },
          ],
        },
      ],
    },
    { type: 'pageBreak' },
    {
      type: 'heading',
      level: 2,
      content: [{ type: 'text', text: 'Câmpuri suplimentare' }],
    },
    ...extraFields.map((field) => ({ type: 'formField' as const, field })),
  ],
};

const seedAssetPath = (filename: string) =>
  resolve(__dirname, 'seed-assets', filename);
const outputDirectory = resolve(process.cwd(), '..', '..', 'tmp', 'pdfs');
const outputPath = resolve(outputDirectory, 'parental-consent-smoke.pdf');

const run = async () => {
  const assets = await Promise.all([
    readFile(seedAssetPath('cercetasii-romaniei.png')),
    readFile(seedAssetPath('safe-from-harm-romania.png')),
    readFile(seedAssetPath('scouts-cluj.png')),
  ]);
  const renderer = new ParentalConsentRendererService();
  const pdf = await renderer.renderPdf({
    activityId: 42,
    publicationReference: 'fixture-cantul-valvelor',
    templateVersionId: 1,
    branch: 'temerari',
    document: fixtureDocument,
    layout: { ...defaultLayoutSettings, headerAssetIds: [1, 2, 3] },
    draft: createRepresentativeOrganizerDraft(),
    organization: {
      name: 'Cercetașii României – Centrul Local Cluj-Napoca',
      address: 'Cluj-Napoca, România',
      email: 'contact@scoutscluj.ro',
      phone: '0700 000 000',
      website: 'https://scoutscluj.ro',
    },
    assets: [
      {
        id: 1,
        altText: 'Cercetașii României',
        contentType: 'image/png',
        fileData: assets[0],
      },
      {
        id: 2,
        altText: 'Safe from Harm România',
        contentType: 'image/png',
        fileData: assets[1],
      },
      {
        id: 3,
        altText: 'Cercetașii Cluj',
        contentType: 'image/png',
        fileData: assets[2],
      },
    ],
  });
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, pdf);
  process.stdout.write(`${outputPath}\n${pdf.length} bytes\n`);
};

void run();
