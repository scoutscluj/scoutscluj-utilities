import {
  branchLabels,
  type BranchCode,
  type DocumentBlock,
  type FormField,
  type InlineNode,
  type LayoutSettings,
  type ModuleKey,
  type OrganizerDraft,
  type OrganizationSettings,
  type TemplateDocument,
  type VariableKey,
} from '@scouts-cluj/parental-consent-schema';
import { Injectable } from '@nestjs/common';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const PAGED_JS_PATH = join(
  dirname(dirname(require.resolve('pagedjs'))),
  'dist',
  'paged.polyfill.js',
);

export type RenderAsset = {
  id: number;
  altText: string;
  contentType: string;
  fileData: Buffer;
};

export type ParentalConsentRenderInput = {
  activityId: number;
  publicationId?: number;
  publicationReference?: string;
  templateVersionId: number;
  branch: BranchCode;
  document: TemplateDocument;
  layout: LayoutSettings;
  draft: OrganizerDraft;
  organization: OrganizationSettings;
  assets: RenderAsset[];
};

const escapeHtml = (value: string | number | boolean | null | undefined) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const safeHref = (href: string) =>
  /^(https?:|mailto:|tel:)/i.test(href) ? href : '#';

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

@Injectable()
export class ParentalConsentRendererService {
  renderHtml(input: ParentalConsentRenderInput) {
    const assets = new Map(input.assets.map((asset) => [asset.id, asset]));
    const body = input.document.content
      .map((block) => this.renderBlock(block, input, assets))
      .filter(Boolean)
      .join('\n');
    const headerAssets = input.layout.headerAssetIds
      .map((assetId) => assets.get(assetId))
      .filter((asset): asset is RenderAsset => Boolean(asset))
      .slice(0, 3);
    const headerSlots = [0, 1, 2]
      .map((index) => {
        const asset = headerAssets[index];
        return asset
          ? `<div class="pc-header-slot pc-header-slot-${index}"><img alt="${escapeHtml(asset.altText)}" src="data:${asset.contentType};base64,${asset.fileData.toString('base64')}"></div>`
          : `<div class="pc-header-slot pc-header-slot-${index}"></div>`;
      })
      .join('');
    const immutableId = input.publicationId
      ? `Publicație #${input.publicationId}`
      : input.publicationReference
        ? `Publicare ${input.publicationReference}`
        : 'PREVIEW – document nepublicat';
    const footerText = `${immutableId} · Activitate #${input.activityId} · Template #${input.templateVersionId} · ${branchLabels[input.branch]}`;
    const margins = input.layout;
    const html = `<!doctype html>
<html lang="ro"><head><meta charset="utf-8"><style>
  @page {
    size: Letter;
    margin: ${Math.max(28, margins.marginTopMm)}mm ${margins.marginRightMm}mm ${Math.max(20, margins.marginBottomMm)}mm ${margins.marginLeftMm}mm;
  }
  * { box-sizing: border-box; }
  body { font-family: Arial, "DejaVu Sans", sans-serif; color: #172033; font-size: ${margins.baseFontSizePt}pt; line-height: 1.38; margin: 0; }
  .pc-print-template { display: none; }
  .pagedjs_margin-top { border-bottom: .25mm solid #d8dee8; }
  .pagedjs_margin-bottom { border-top: .25mm solid #d8dee8; }
  .pc-header-margin .pagedjs_margin-content { display: flex; align-items: center; height: 100%; }
  .pc-header-margin img { max-height: 14mm; max-width: 40mm; object-fit: contain; }
  .pc-footer-margin { color: #5d6878; font: 8px Arial, sans-serif; white-space: nowrap; }
  .pc-footer-reference .pagedjs_margin-content { overflow: visible; }
  h1 { color: #17365d; font-size: 19pt; text-align: center; margin: 0 0 10mm; }
  h2 { color: #17365d; font-size: 14pt; margin: 6mm 0 2mm; break-after: avoid; }
  h3 { color: #17365d; font-size: 11.5pt; margin: 4mm 0 1.5mm; break-after: avoid; }
  p { margin: 0 0 2.5mm; }
  a { color: #174e88; text-decoration: underline; }
  table { border-collapse: collapse; width: 100%; margin: 3mm 0; break-inside: avoid; }
  td { border: .25mm solid #8a96a8; padding: 2mm; vertical-align: top; }
  .callout { border-left: 1.2mm solid #2d6a9f; background: #eef6fc; padding: 3mm; margin: 3mm 0; break-inside: avoid; }
  .callout.warning { border-color: #c77b00; background: #fff7e5; }
  .callout.important { border-color: #a12828; background: #fff0f0; }
  .separator { border: 0; border-top: .3mm solid #9aa6b7; margin: 4mm 0; }
  .page-break { break-after: page; }
  .asset { display: block; max-width: 100%; height: auto; margin: 2mm auto; }
  .variable { font-weight: 700; }
  .module { margin: 3mm 0; break-inside: avoid; }
  .module h3 { margin-top: 0; }
  .field { margin: 3mm 0; break-inside: avoid-page; page-break-inside: avoid; }
  .field-label { display: block; font-weight: 700; margin-bottom: 1.2mm; }
  .field-help { display: block; color: #4e5b70; font-size: 8.5pt; margin-bottom: 1mm; }
  .line { border-bottom: .3mm solid #283548; height: 7mm; }
  .box { display: inline-block; width: 4mm; height: 4mm; border: .3mm solid #283548; vertical-align: -.5mm; margin-right: 1.5mm; }
  .choices { display: flex; flex-wrap: wrap; gap: 3mm 7mm; }
  .signature-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 8mm; }
  .read-only { background: #f4f6f8; border: .25mm solid #cbd3df; padding: 2mm; }
  ul, ol { margin: 1.5mm 0 3mm 6mm; padding-left: 4mm; }
  @media print {
    .pagedjs_pages .page-break { break-after: auto !important; page-break-after: auto !important; }
  }
</style></head><body><div class="pc-print-template"><div id="pc-header-template">${headerSlots}</div><span id="pc-footer-template">${escapeHtml(footerText)}</span></div><main>${body}</main></body></html>`;

    return { html };
  }

  async renderPdf(input: ParentalConsentRenderInput): Promise<Buffer> {
    const rendered = this.renderHtml(input);
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        locale: 'ro-RO',
        timezoneId: 'Europe/Bucharest',
      });
      await context.route('**/*', async (route) => {
        const url = route.request().url();
        if (url.startsWith('data:') || url.startsWith('about:'))
          await route.continue();
        else await route.abort('blockedbyclient');
      });
      const page = await context.newPage();
      await page.setContent(rendered.html, { waitUntil: 'load' });
      await page.evaluate(() => {
        (
          window as typeof window & { PagedConfig?: { auto: boolean } }
        ).PagedConfig = {
          auto: false,
        };
      });
      await page.addScriptTag({ path: PAGED_JS_PATH });
      const printTemplates = await page.evaluate(() => ({
        headers: Array.from(
          document.querySelector<HTMLElement>('#pc-header-template')
            ?.children ?? [],
        ).map((element) => element.innerHTML),
        footer:
          document.querySelector<HTMLElement>('#pc-footer-template')
            ?.textContent ?? '',
      }));
      await page.evaluate(async () => {
        const pagedWindow = window as typeof window & {
          PagedPolyfill: { preview: () => Promise<unknown> };
        };
        await pagedWindow.PagedPolyfill.preview();
      });
      const pagedPageCount = await page.evaluate(({ headers, footer }) => {
        const pageBoxes = Array.from(
          document.querySelectorAll<HTMLElement>('.pagedjs_pagebox'),
        );
        const totalPages = pageBoxes.length;
        const headerSelectors = [
          '.pagedjs_margin-top-left',
          '.pagedjs_margin-top-center',
          '.pagedjs_margin-top-right',
        ];

        pageBoxes.forEach((pageBox, index) => {
          headerSelectors.forEach((selector, headerIndex) => {
            const margin = pageBox.querySelector<HTMLElement>(selector);
            const content = margin?.querySelector<HTMLElement>(
              '.pagedjs_margin-content',
            );
            if (!margin || !content) return;
            margin.classList.add('hasContent', 'pc-header-margin');
            content.innerHTML = headers[headerIndex] ?? '';
          });

          const footerLeft = pageBox.querySelector<HTMLElement>(
            '.pagedjs_margin-bottom-left',
          );
          const footerLeftContent = footerLeft?.querySelector<HTMLElement>(
            '.pagedjs_margin-content',
          );
          if (footerLeft && footerLeftContent) {
            footerLeft.classList.add(
              'hasContent',
              'pc-footer-margin',
              'pc-footer-reference',
            );
            footerLeftContent.textContent = footer;
          }

          const footerRight = pageBox.querySelector<HTMLElement>(
            '.pagedjs_margin-bottom-right',
          );
          const footerRightContent = footerRight?.querySelector<HTMLElement>(
            '.pagedjs_margin-content',
          );
          if (footerRight && footerRightContent) {
            footerRight.classList.add(
              'hasContent',
              'pc-footer-margin',
              'pc-footer-number',
            );
            footerRightContent.textContent = `Pagina ${index + 1} din ${totalPages}`;
          }
        });
        return totalPages;
      }, printTemplates);
      if (pagedPageCount < 1) {
        throw new Error('Parental-consent pagination produced no pages');
      }
      await page.emulateMedia({ media: 'print' });
      const pdf = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
      });
      await context.close();
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  safeFilename(title: string, branch: BranchCode) {
    return `acord-parental-${slug(title) || 'activitate'}-${branch}.pdf`;
  }

  private renderBlock(
    block: DocumentBlock,
    input: ParentalConsentRenderInput,
    assets: Map<number, RenderAsset>,
  ): string {
    switch (block.type) {
      case 'paragraph':
        return `<p>${this.renderInline(block.content ?? [])}</p>`;
      case 'heading':
        return `<h${block.level}>${this.renderInline(block.content ?? [])}</h${block.level}>`;
      case 'callout':
        return `<aside class="callout ${block.tone}">${block.content.map((paragraph) => `<p>${this.renderInline(paragraph.content ?? [])}</p>`).join('')}</aside>`;
      case 'bulletList':
      case 'orderedList': {
        const tag = block.type === 'bulletList' ? 'ul' : 'ol';
        return `<${tag}>${block.content.map((item) => `<li>${item.content.map((entry) => this.renderBlock(entry, input, assets)).join('')}</li>`).join('')}</${tag}>`;
      }
      case 'table':
        return `<table>${block.content.map((row) => `<tr>${row.content.map((cell) => `<td>${cell.content.map((paragraph) => `<p>${this.renderInline(paragraph.content ?? [])}</p>`).join('')}</td>`).join('')}</tr>`).join('')}</table>`;
      case 'separator':
        return '<hr class="separator">';
      case 'pageBreak':
        return '<div class="page-break"></div>';
      case 'asset': {
        const asset = assets.get(block.assetId);
        if (!asset)
          throw new Error(`Unknown parental-consent asset: ${block.assetId}`);
        const width = Math.min(100, Math.max(10, block.widthPercent ?? 50));
        return `<img class="asset" style="width:${width}%" alt="${escapeHtml(block.alt)}" src="data:${asset.contentType};base64,${asset.fileData.toString('base64')}">`;
      }
      case 'variable':
        return `<p class="variable">${escapeHtml(this.resolveVariable(block.key, input))}</p>`;
      case 'formField':
        return this.renderField(block.field);
      case 'module':
        return this.renderModule(block.key, input);
    }
  }

  private renderInline(nodes: InlineNode[]) {
    return nodes
      .map((node) => {
        let value = escapeHtml(node.text);
        for (const mark of node.marks ?? []) {
          if (mark.type === 'bold') value = `<strong>${value}</strong>`;
          else if (mark.type === 'italic') value = `<em>${value}</em>`;
          else if (mark.type === 'underline') value = `<u>${value}</u>`;
          else if (mark.type === 'link') {
            value = `<a href="${escapeHtml(safeHref(mark.href))}">${value}</a>`;
          }
        }
        return value;
      })
      .join('');
  }

  private resolveVariable(key: VariableKey, input: ParentalConsentRenderInput) {
    const branch = input.draft.branches[input.branch];
    const values: Record<VariableKey, string> = {
      'organization.name': input.organization.name,
      'organization.address': input.organization.address,
      'organization.email': input.organization.email,
      'organization.phone': input.organization.phone,
      'activity.title': input.draft.general.title,
      'activity.location': input.draft.general.location,
      'activity.startDate': input.draft.general.startDate,
      'activity.endDate': input.draft.general.endDate,
      'activity.emergencyContactName': input.draft.general.emergencyContactName,
      'activity.emergencyContactPhone':
        input.draft.general.emergencyContactPhone,
      'branch.label': branchLabels[input.branch],
      'branch.startDate': branch.startDate,
      'branch.endDate': branch.endDate,
    };
    if (!(key in values))
      throw new Error(`Unknown parental-consent variable: ${key}`);
    return values[key];
  }

  private renderField(field: FormField): string {
    const label = `<span class="field-label">${escapeHtml(field.label)}${field.required ? ' *' : ''}</span>`;
    const help = field.helpText
      ? `<span class="field-help">${escapeHtml(field.helpText)}</span>`
      : '';
    let control = '';
    if (
      ['short_text', 'date', 'number', 'phone', 'email'].includes(field.type)
    ) {
      control = '<div class="line"></div>';
    } else if (field.type === 'long_text') {
      control = Array.from(
        { length: Math.max(2, Math.min(12, field.handwrittenLines ?? 4)) },
        () => '<div class="line"></div>',
      ).join('');
    } else if (field.type === 'yes_no') {
      control =
        '<div class="choices"><span><i class="box"></i>Da</span><span><i class="box"></i>Nu</span></div>';
    } else if (
      ['single_choice', 'multiple_choice', 'dropdown'].includes(field.type)
    ) {
      control = `<div class="choices">${(field.options ?? []).map((option) => `<span><i class="box"></i>${escapeHtml(option.label)}</span>`).join('')}</div>`;
    } else if (field.type === 'acknowledgement') {
      control = '<div><i class="box"></i>Confirm</div>';
    } else if (field.type === 'signature') {
      control =
        '<div class="signature-grid"><div><span class="field-help">Semnătură</span><div class="line"></div></div><div><span class="field-help">Data</span><div class="line"></div></div></div>';
    } else if (field.type === 'read_only') {
      control = '<div class="read-only">Informație inclusă în acord</div>';
    } else if (field.type === 'repeating_group') {
      control = `<table><tr>${(field.children ?? []).map((child) => `<td>${escapeHtml(child.label)}</td>`).join('')}</tr>${[0, 1, 2].map(() => `<tr>${(field.children ?? []).map(() => '<td>&nbsp;<br>&nbsp;</td>').join('')}</tr>`).join('')}</table>`;
    }
    return `<section class="field" data-field-code="${escapeHtml(field.code)}">${label}${help}${control}</section>`;
  }

  private renderModule(
    key: ModuleKey,
    input: ParentalConsentRenderInput,
  ): string {
    const draft = input.draft;
    const branch = draft.branches[input.branch];
    const list = (items: string[]) =>
      `<ul>${items
        .filter(Boolean)
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('')}</ul>`;
    const section = (title: string, body: string) =>
      body
        ? `<section class="module"><h3>${escapeHtml(title)}</h3>${body}</section>`
        : '';
    switch (key) {
      case 'transport':
        return section(
          'Transport și preluare',
          `<p><strong>Tur:</strong> ${escapeHtml(branch.outboundTransport || 'Nespecificat')}</p><p><strong>Retur:</strong> ${escapeHtml(branch.returnTransport || 'Nespecificat')}</p>${branch.pickupDetails ? `<p>${escapeHtml(branch.pickupDetails)}</p>` : ''}`,
        );
      case 'accommodation':
        return draft.accommodation.enabled
          ? section(
              'Cazare',
              `<p>${escapeHtml(draft.accommodation.details)}</p>`,
            )
          : '';
      case 'activity_catalog':
        return section('Activități', list(branch.activities));
      case 'water':
        return draft.water.enabled
          ? section(
              'Activități pe apă',
              `${list(draft.water.activities)}<p>${escapeHtml(draft.water.details)}</p>${draft.water.raftConstructionOnly ? '<p>Pluta este doar construită la mal; nu este utilizată pentru deplasare pe apă.</p>' : ''}`,
            )
          : '';
      case 'tools':
        return draft.tools.enabled &&
          draft.tools.branches.includes(input.branch)
          ? section(
              'Unelte și obiecte ascuțite',
              `<p>${escapeHtml(draft.tools.details)}</p>`,
            )
          : '';
      case 'fire_cooking_blacksmithing':
        return draft.fireCookingBlacksmithing.enabled &&
          draft.fireCookingBlacksmithing.branches.includes(input.branch)
          ? section(
              'Foc, gătit și fierărie',
              `<p>${escapeHtml(draft.fireCookingBlacksmithing.details)}</p>`,
            )
          : '';
      case 'hiking':
        return draft.hiking.enabled
          ? section(
              'Drumeție și adăpost',
              `<p>${escapeHtml(draft.hiking.details)}</p>${draft.hiking.overnightShelter ? '<p>Programul include înnoptare în adăpost.</p>' : ''}`,
            )
          : '';
      case 'first_aid':
        return section(
          'Prim ajutor',
          `${list(draft.firstAid.responsiblePeople)}${draft.firstAid.facility ? `<p>Unitate medicală de referință: ${escapeHtml(draft.firstAid.facility)}</p>` : ''}<p>${escapeHtml(draft.firstAid.details)}</p>`,
        );
      case 'food_allergies':
        return draft.foodAllergies.mealsProvided ||
          draft.foodAllergies.allergyHandling ||
          draft.foodAllergies.details
          ? section(
              'Hrană și alergii',
              `<p>${escapeHtml(draft.foodAllergies.allergyHandling)}</p><p>${escapeHtml(draft.foodAllergies.details)}</p>`,
            )
          : '';
      case 'equipment':
        return section('Echipament necesar', list(branch.equipment));
      case 'conduct_sfh':
        return section(
          'Conduită și Safe from Harm',
          `${draft.conductSfh.regulationUrl ? `<p>Regulament: ${escapeHtml(draft.conductSfh.regulationUrl)}</p>` : ''}<p>${escapeHtml(draft.conductSfh.safeFromHarmDetails)}</p><p>${escapeHtml(draft.conductSfh.details)}</p>`,
        );
    }
  }
}

export const parentalConsentEscapeHtml = escapeHtml;
