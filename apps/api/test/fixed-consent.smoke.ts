import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { consentForUnit } from '@scouts-cluj/parental-consent-schema';
import { renderFixedConsent } from '../src/modules/parental-consent/fixed-consent-renderer';

async function main() {
  const details = {
    representative: 'Reprezentant de test',
    coordinators: 'Coordonator de test',
    communication:
      'Părinții contactează liderul prin telefonul comunicat înaintea plecării.',
    commonActivities:
      'Jocuri de echipă, orientare și ateliere educative.\nActivități de cooperare și protejarea naturii.',
    specificActivities:
      'Drumeție de 5 km, adaptată grupului.\nAteliere practice cu instructaj și supraveghere.',
    activityNotes:
      'Programul se adaptează vremii și nivelului grupului. Nu sunt prevăzute activități pe apă.',
    outboundTransport:
      'Transport cu autocarul. Plecare la ora 08:00, din locul comunicat de organizatori.',
    returnTransport:
      'Preluare de către părinți la sfârșitul activității, la ora 17:00.',
    equipment:
      'Rucsac\nBocanci\nPelerină\nRecipient pentru apă\nHaine de schimb\nFrontală',
    equipmentNotes: 'Uneltele sunt folosite numai în activități supravegheate.',
    firstAidPeople:
      'Responsabil de prim ajutor de test — persoană instruită, desemnată de organizator.',
    medicalFacilities:
      'Unitatea medicală de referință de test — 10 km, aproximativ 20 minute.',
  };
  const bytes = await renderFixedConsent({
    title: 'Drumeția de verificare 2027',
    location: 'Locație sintetică, județul Cluj',
    startDate: '2027-05-15',
    endDate: '2027-05-16',
    branch: 'temerari',
    details: consentForUnit(
      details,
      { one: details.specificActivities, two: 'OTHER_UNIT_MUST_NOT_APPEAR' },
      'one',
    ),
    answers: {
      participant_name: 'Participant de test Ștefan',
      birth_date: '2013-03-14',
      guardian_name: 'Părinte de test',
      guardian_relation: 'mother',
      guardian_phone: '0700000000',
      emergency_name: 'Contact de test',
      emergency_phone: '0700000001',
      transport: 'branch',
      treatment: 'call_first',
      medical_notes: 'Nu există',
      medical_relevant: 'no',
      acknowledgement: true,
      photo_uses: ['closed_groups'],
      medication: 'Nu există',
      medication_mode: 'self',
      medication_dose: 'STALE_MEDICATION_MUST_NOT_APPEAR',
    },
  });
  assert(bytes.subarray(0, 5).equals(Buffer.from('%PDF-')));
  const directory = resolve('../../tmp/fixed-consent');
  await mkdir(directory, { recursive: true });
  const file = resolve(directory, 'acord.pdf');
  await writeFile(file, bytes);
  const { stdout } = await promisify(execFile)('pdftotext', [
    '-layout',
    file,
    '-',
  ]);
  for (const value of [
    'Drumeția de verificare 2027',
    'Participant de test Ștefan',
    'Părinte de test',
    'Siguranță, sănătate',
    'Fotografiere și filmare',
    'Activități specifice',
    '• Jocuri de echipă',
    '• Activități de cooperare',
    '15.05.2027',
  ])
    assert(stdout.includes(value), `Missing rendered content: ${value}`);
  for (const stale of [
    '{{',
    'Cântul Vâlvelor',
    'Opriș Dan',
    'Gabriel Boer',
    'Roșia Montană',
    'OTHER_UNIT_MUST_NOT_APPEAR',
    'STALE_MEDICATION_MUST_NOT_APPEAR',
  ])
    assert(!stdout.includes(stale), `Stale template content: ${stale}`);
  console.log(
    'PASS supplied Word layout, activity placeholders, participant fields and Unicode PDF rendering',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
