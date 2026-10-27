import type { FormField, TemplateDocument } from "./contracts.js";

// Stable codes shared by registration answers, reusable profiles and printed forms.
export const participationFields: FormField[] = [
  {
    code: "participant_name",
    type: "short_text",
    label: "Nume participant",
    required: true,
  },
  { code: "birth_date", type: "date", label: "Data nașterii", required: true },
  {
    code: "guardian_name",
    type: "short_text",
    label: "Nume reprezentant legal",
    required: true,
  },
  {
    code: "guardian_relation",
    type: "single_choice",
    label: "Calitatea reprezentantului legal",
    required: true,
    options: [
      { value: "mother", label: "Mamă" },
      { value: "father", label: "Tată" },
      { value: "guardian", label: "Tutore" },
      { value: "other", label: "Alt reprezentant legal" },
    ],
  },
  {
    code: "guardian_phone",
    type: "phone",
    label: "Telefon principal",
    required: true,
  },
  { code: "secondary_phone", type: "phone", label: "Telefon secundar" },
  {
    code: "emergency_name",
    type: "short_text",
    label: "Contact alternativ — nume și relație",
    required: true,
  },
  {
    code: "emergency_phone",
    type: "phone",
    label: "Telefon contact alternativ",
    required: true,
  },
  {
    code: "transport",
    type: "single_choice",
    label: "Transport",
    required: true,
    options: [
      { value: "branch", label: "Urmez planul de transport al ramurii" },
      {
        value: "personal",
        label:
          "Asigur transportul personal, conform înțelegerii confirmate cu liderul",
      },
    ],
  },
  {
    code: "treatment",
    type: "single_choice",
    label: "Tratament simptomatic",
    required: true,
    options: [
      {
        value: "approved",
        label:
          "Sunt de acord conform protocolului medical aprobat, prospectului și contraindicațiilor declarate",
      },
      {
        value: "call_first",
        label: "Sunt de acord numai după contact telefonic",
      },
      {
        value: "no",
        label:
          "Nu sunt de acord fără acordul meu telefonic, cu excepția măsurilor de urgență ale serviciilor medicale competente",
      },
    ],
  },
  {
    code: "medical_notes",
    type: "long_text",
    label:
      "Afecțiuni, alergii, limitări de efort, plan de intervenție și contraindicații",
    helpText: "Scrie „Nu există” dacă nu sunt informații relevante.",
    required: true,
  },
  {
    code: "dietary",
    type: "long_text",
    label: "Regim alimentar și restricții",
  },
  {
    code: "support_needs",
    type: "long_text",
    label: "Nevoi de sprijin fizic, emoțional sau comportamental",
  },
  {
    code: "medication",
    type: "long_text",
    label: "Medicație personală",
    helpText:
      "Pentru fiecare medicament: denumire, doză, orar, motiv, păstrare și instrucțiuni speciale.",
  },
  {
    code: "medication_mode",
    type: "single_choice",
    label: "Mod de administrare a medicației personale",
    options: [
      { value: "none", label: "Fără medicație personală" },
      { value: "self", label: "Autonom de participant" },
      { value: "supervised", label: "Cu supraveghere" },
      { value: "medical", label: "De personal medical" },
    ],
  },
  {
    code: "photo_uses",
    type: "multiple_choice",
    label: "Fotografiere și filmare — opțional",
    helpText:
      "Refuzul nu afectează participarea. Fără opțiuni selectate înseamnă că nu acorzi niciunul dintre aceste consimțăminte.",
    options: [
      { value: "archive", label: "Arhiva internă a organizației" },
      {
        value: "closed_groups",
        label: "Grupuri închise ale participanților și părinților",
      },
      { value: "website", label: "Site-ul organizației" },
      { value: "social", label: "Paginile oficiale de social media" },
      { value: "print", label: "Materiale tipărite, rapoarte și prezentări" },
      {
        value: "partners",
        label: "Parteneri sau presă pentru comunicarea activității",
      },
    ],
  },
  {
    code: "acknowledgement",
    type: "acknowledgement",
    required: true,
    label:
      "Confirm că sunt reprezentantul legal și am dreptul de a semna. Am citit informațiile activității, riscurile, transportul, echipamentul și regulile; sunt de acord cu participarea, primul ajutor și intervențiile de urgență. Datele sunt complete și actuale; voi comunica schimbările înainte de plecare.",
  },
  {
    code: "guardian_signature",
    type: "signature",
    label: "Semnătura reprezentantului legal",
    required: true,
  },
];

const paragraph = (text: string) => ({
  type: "paragraph" as const,
  content: [{ type: "text" as const, text }],
});
const heading = (text: string) => ({
  type: "heading" as const,
  level: 2 as const,
  content: [{ type: "text" as const, text }],
});

// Deliberately contains no names, dates, routes or clinical protocols from the example.
// Organizers provide these through typed activity modules; administrators own common clauses.
export const participationTemplate: TemplateDocument = {
  type: "doc",
  content: [
    {
      type: "heading",
      level: 1,
      content: [
        { type: "text", text: "Acord parental și fișă de participare" },
      ],
    },
    { type: "variable", key: "activity.title" },
    { type: "variable", key: "branch.label" },
    paragraph(
      "Completați formularul online, descărcați acordul și semnați olograf fiecare pagină pentru predarea fizică la plecare sau semnați digital întregul PDF și încărcați-l în platformă.",
    ),
    heading("1. Informații despre activitate"),
    { type: "variable", key: "organization.name" },
    { type: "variable", key: "activity.location" },
    { type: "variable", key: "branch.startDate" },
    { type: "variable", key: "branch.endDate" },
    { type: "variable", key: "activity.emergencyContactName" },
    { type: "variable", key: "activity.emergencyContactPhone" },
    ...(
      [
        "activity_catalog",
        "transport",
        "accommodation",
        "water",
        "tools",
        "fire_cooking_blacksmithing",
        "hiking",
        "equipment",
      ] as const
    ).map((key) => ({ type: "module" as const, key })),
    paragraph(
      "Programul poate fi modificat, amânat, înlocuit sau oprit din motive de siguranță, condiții meteorologice, starea traseelor ori nivelul grupului. Activitățile în natură implică riscuri previzibile: căderi, alunecări, răni, înțepături, căpușe, expunere la soare, frig sau ploaie, deshidratare, oboseală, alergii și incidente legate de teren, unelte, foc ori apă. Organizatorul aplică măsuri de prevenție, instruire și supraveghere adaptate vârstei. Informarea nu înlătură răspunderea pentru obligațiile legale sau neglijență.",
    ),
    paragraph(
      "Transportul de urgență poate fi asigurat de serviciile de urgență ori de un adult desemnat către un punct sigur sau o unitate medicală. În situații non-urgente, transportul într-un autoturism personal al unui adult necesită acordul direct al reprezentantului legal.",
    ),
    heading("2. Siguranță sănătate și protecția datelor"),
    { type: "module", key: "first_aid" },
    { type: "module", key: "food_allergies" },
    { type: "module", key: "conduct_sfh" },
    paragraph(
      "Persoanele instruite acordă primul ajutor în limita competențelor. În urgență, organizatorii pot apela 112 și solicita evaluare, intervenție și transport medical. Părintele este contactat de îndată; măsurile urgente nu sunt amânate dacă întârzierea pune participantul în pericol. Acordul pentru tratament simptomatic privește exclusiv medicația fără prescripție din protocolul aprobat și nu înlocuiește instrucțiunile pentru medicamente prescrise.",
    ),
    paragraph(
      "Reprezentantul legal declară alergiile, afecțiunile, limitările, nevoile de sprijin și restricțiile alimentare. În cazul alergiilor severe, furnizează planul de intervenție și medicația prescrisă. Contaminarea accidentală nu poate fi eliminată complet în camp. Medicația personală se predă la solicitarea organizatorilor, în ambalajul original etichetat cu numele participantului, doza și orarul; se furnizează instrucțiunile scrise necesare.",
    ),
    paragraph(
      "Participantul respectă instrucțiunile liderilor și regulile de siguranță. Sunt interzise violența, bullying-ul, hărțuirea, discriminarea și părăsirea neautorizată a grupului. Dacă participarea nu poate continua în siguranță, organizatorii pot solicita preluarea anticipată de către reprezentantul legal ori o persoană desemnată în scris. Îngrijorările Safe from Harm se raportează coordonatorului sau prin canalele oficiale ale organizației.",
    ),
    paragraph(
      "Consimțămintele pentru imagine sunt opționale și separate; refuzul nu afectează participarea. Retragerea produce efecte pentru utilizările viitoare. Eliminarea completă din materiale tipărite sau conținut preluat legal de terți poate să nu fie posibilă.",
    ),
    paragraph(
      "Organizația utilizează datele de identificare, contact, participare și sănătate pentru organizare, siguranță, sprijin, urgențe și obligațiile legale. Accesul este limitat la persoanele autorizate, furnizorii implicați strict în activitate și serviciile competente când este necesar. Păstrarea urmează politica organizației și obligațiile aplicabile. Pentru acces, rectificare, ștergere, restricționare, opoziție sau retragerea consimțământului, folosiți contactul organizației. Aveți dreptul de a depune plângere la ANSPDCP.",
    ),
    { type: "variable", key: "organization.email" },
    { type: "separator" },
    heading("3. Formular de acord de participare"),
    ...participationFields.map((field) => ({
      type: "formField" as const,
      field,
    })),
  ],
};
