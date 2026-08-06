import {
  createRepresentativeOrganizerDraft,
  defaultLayoutSettings,
  formFieldTypes,
  initialTemplateDocument,
  type BranchCode,
  type FormField,
  type TemplateDocument,
} from '@scouts-cluj/parental-consent-schema';
import { ParentalConsentRendererService } from './parental-consent-renderer.service';

describe('ParentalConsentRendererService', () => {
  const renderer = new ParentalConsentRendererService();
  const input = (branch: BranchCode = 'lupisori') => ({
    activityId: 9,
    templateVersionId: 2,
    branch,
    document: initialTemplateDocument,
    layout: defaultLayoutSettings,
    draft: createRepresentativeOrganizerDraft(),
    organization: {
      name: 'Scouts Cluj',
      address: 'Cluj',
      email: 'test@example.com',
      phone: '0700',
    },
    assets: [],
  });

  it('escapes inserted values and renders branch-specific modules', () => {
    const renderInput = input();
    renderInput.draft.general.title =
      '<script>alert(1)</script> Cântul Vâlvelor';
    const result = renderer.renderHtml(renderInput);
    expect(result.html).toContain('Cântul Vâlvelor');
    expect(result.html).not.toContain('<script>');
    expect(result.html).not.toContain('Unelte și obiecte ascuțite');
    expect(result.html).toContain('PREVIEW');
  });

  it('renders deterministic branch differences and construction-only raft text', () => {
    const lupisori = renderer.renderHtml(input('lupisori')).html;
    const temerari = renderer.renderHtml(input('temerari')).html;
    const exploratori = renderer.renderHtml(input('exploratori')).html;

    expect(renderer.renderHtml(input('temerari')).html).toBe(temerari);
    expect(new Set([lupisori, temerari, exploratori]).size).toBe(3);
    expect(lupisori).toContain('Lupișori');
    expect(temerari).toContain('Temerari');
    expect(exploratori).toContain('Exploratori');
    expect(lupisori).not.toContain('Unelte și obiecte ascuțite');
    expect(temerari).toContain('Unelte și obiecte ascuțite');
    expect(temerari).toContain(
      'Pluta este doar construită la mal; nu este utilizată pentru deplasare pe apă.',
    );
  });

  it('renders a handwritten control for every supported form-field type', () => {
    const fields: FormField[] = formFieldTypes.map((type, index) => ({
      code: `field_${type}`,
      type,
      label: `Câmp ${index + 1}`,
      helpText: 'Instrucțiuni',
      required: true,
      options: ['single_choice', 'multiple_choice', 'dropdown'].includes(type)
        ? [{ value: 'da', label: 'Opțiune' }]
        : undefined,
      handwrittenLines: type === 'long_text' ? 3 : undefined,
      children:
        type === 'repeating_group'
          ? [{ code: 'child', type: 'short_text', label: 'Coloană' }]
          : undefined,
    }));
    const document: TemplateDocument = {
      type: 'doc',
      content: fields.map((field) => ({ type: 'formField', field })),
    };

    const html = renderer.renderHtml({ ...input(), document }).html;
    for (const field of fields) {
      expect(html).toContain(`data-field-code="${field.code}"`);
    }
  });

  it('rejects unknown variables at render time', () => {
    const document = {
      type: 'doc',
      content: [{ type: 'variable', key: 'activity.unknown' }],
    } as unknown as TemplateDocument;

    expect(() => renderer.renderHtml({ ...input(), document })).toThrow(
      'Unknown parental-consent variable',
    );
  });

  it('uses stable safe filenames', () => {
    expect(renderer.safeFilename('Cântul Vâlvelor 2026', 'temerari')).toBe(
      'acord-parental-cantul-valvelor-2026-temerari.pdf',
    );
  });
});
