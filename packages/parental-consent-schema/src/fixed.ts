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
  representative: 'Reprezentantul legal al organizatorului',
  coordinators: 'Coordonatorii activității',
  communication: 'Comunicarea cu părinții',
  commonActivities: 'Activități comune',
  specificActivities: 'Activități specifice participanților',
  activityNotes: 'Precizări despre program, drumeții, apă, foc și unelte',
  outboundTransport: 'Transport la plecare',
  returnTransport: 'Transport la întoarcere și preluare',
  equipment: 'Echipament necesar (un element pe rând)',
  equipmentNotes: 'Condiții pentru briceag, unelte și echipament',
  firstAidPeople: 'Responsabili de prim ajutor și calificările lor',
  medicalFacilities: 'Unități medicale de referință, distanțe și timpi orientativi',
};

export const emptyFixedConsent = (): FixedConsentDetails =>
  Object.fromEntries(Object.keys(fixedConsentLabels).map((key) => [key, ''])) as FixedConsentDetails;
