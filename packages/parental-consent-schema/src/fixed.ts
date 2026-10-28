export type FixedConsentDetails = {
  representative: string;
  coordinators: string;
  communication: string;
  commonActivities: string;
  specificActivities: string;
  activityNotes: string;
  outboundTransport: string;
  returnTransport: string;
  equipment: string;
  equipmentNotes: string;
  firstAidPeople: string;
  medicalFacilities: string;
};

export const fixedConsentLabels: Record<keyof FixedConsentDetails, string> = {
  representative: "Reprezentantul legal al organizatorului",
  coordinators: "Coordonatorii activității",
  communication: "Comunicarea cu părinții pe durata activității",
  commonActivities: "Activități",
  specificActivities: "Activități specifice unei ramuri sau grupe",
  activityNotes:
    "Precizări suplimentare despre program și condițiile de siguranță",
  outboundTransport: "Transport la plecare",
  returnTransport: "Transport la întoarcere și preluare",
  equipment: "Echipament necesar",
  equipmentNotes: "Condiții pentru briceag, unelte și echipament",
  firstAidPeople: "Responsabili de prim ajutor și calificările lor",
  medicalFacilities:
    "Unități medicale de referință, distanțe și timpi orientativi",
};
export const fixedConsentOptionalFields: (keyof FixedConsentDetails)[] = [
  "communication",
  "specificActivities",
  "activityNotes",
  "equipmentNotes",
];
export const fixedConsentHelp: Record<keyof FixedConsentDetails, string> = {
  representative:
    "Numele și calitatea persoanei care reprezintă legal organizatorul în acest acord.",
  coordinators:
    "Numele coordonatorilor și numerele de telefon la care pot fi contactați pentru această activitate.",
  communication:
    "Cum primesc părinții informații: persoana de contact, canalul folosit și eventualele intervale pentru comunicare.",
  commonActivities:
    "Descrie programul urmat de toți participanții: ateliere, activități în natură, drumeții și alte activități comune.",
  specificActivities:
    "Completează numai dacă anumite ramuri sau grupe au activități diferite de programul comun. Precizează cui i se aplică.",
  activityNotes:
    "Adaugă doar particularitățile relevante: modificări posibile ale programului sau condiții specifice pentru drumeții, apă, foc și unelte.",
  outboundTransport:
    "Locul și ora întâlnirii, mijlocul de transport, destinația și persoana de contact pentru plecare.",
  returnTransport:
    "Locul și ora estimată a întoarcerii și cum sunt preluați participanții de părinți sau reprezentanți.",
  equipment:
    "Lista concretă de echipament de adus. Scrie fiecare obiect pe un rând; documentul permite până la 20 de elemente.",
  equipmentNotes:
    "Reguli suplimentare pentru echipamentul special, briceag și alte unelte, dacă sunt relevante pentru activitate.",
  firstAidPeople:
    "Numele persoanelor care asigură primul ajutor, pregătirea lor și modul în care sunt contactate.",
  medicalFacilities:
    "Unitățile medicale relevante pentru locația activității și distanțele sau timpii orientativi până la acestea.",
};

export const emptyFixedConsent = (): FixedConsentDetails =>
  Object.fromEntries(
    Object.keys(fixedConsentLabels).map((key) => [key, ""]),
  ) as FixedConsentDetails;

/** New publications select activities by unit; legacy snapshots retain their original text. */
export function consentForUnit(
  details: FixedConsentDetails,
  unitActivities?: Record<string, string>,
  unitId?: string | null,
): FixedConsentDetails {
  return {
    ...details,
    specificActivities:
      unitActivities === undefined
        ? details.specificActivities
        : unitId
          ? (unitActivities[unitId] ?? "")
          : "",
  };
}
