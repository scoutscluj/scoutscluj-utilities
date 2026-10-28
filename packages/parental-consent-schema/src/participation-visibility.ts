export const medicationDetailFields = [
  "medication_mode",
  "medication_dose",
  "medication_reason",
  "medication_storage",
  "medication_instructions",
] as const;

export function hasPersonalMedication(
  answers: Record<string, unknown>,
): boolean {
  const value = String(answers.medication ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[.!\s]+$/g, "");
  return (
    !!value &&
    ![
      "nu",
      "nu exista",
      "nu are",
      "fara medicatie",
      "fara medicatie personala",
      "nu este cazul",
      "nu ia medicamente",
      "niciuna",
      "none",
      "no",
      "n/a",
      "-",
      "—",
    ].includes(value)
  );
}
export function participationFieldVisible(
  code: string,
  answers: Record<string, unknown>,
): boolean {
  return (
    !medicationDetailFields.some((field) => field === code) ||
    hasPersonalMedication(answers)
  );
}
export function visibleParticipationAnswers<T extends Record<string, unknown>>(
  answers: T,
): T {
  const result = { ...answers };
  if (!hasPersonalMedication(answers))
    for (const code of medicationDetailFields) delete result[code];
  return result;
}
