import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasPersonalMedication,
  visibleParticipationAnswers,
  participationFieldVisible,
} from "./participation-visibility.js";
import { consentForUnit, emptyFixedConsent } from "./fixed.js";
test("absence of medication hides and removes dependent details while preserving the original answers", () => {
  for (const value of [
    "",
    "Nu există",
    "nu exista.",
    "Nu",
    "Fără medicație",
    "-",
  ]) {
    const answers = {
      medication: value,
      medication_mode: "self",
      medication_dose: "stale",
    };
    assert.equal(hasPersonalMedication(answers), false);
    assert.equal(participationFieldVisible("medication_mode", answers), false);
    assert.deepEqual(visibleParticipationAnswers(answers), {
      medication: value,
    });
    assert.equal(answers.medication_mode, "self");
  }
  assert.equal(
    hasPersonalMedication({ medication: "Medicament cu doza prescrisă" }),
    true,
  );
});
test("each agreement contains only its unit-specific activities; old snapshots retain their text", () => {
  const details = {
    ...emptyFixedConsent(),
    commonActivities: "Program comun",
    specificActivities: "Text vechi",
  };
  const activities = {
    cluj: "Activitate Cluj",
    floresti: "Activitate Florești",
  };
  assert.equal(
    consentForUnit(details, activities, "cluj").specificActivities,
    "Activitate Cluj",
  );
  assert.equal(
    consentForUnit(details, activities, "other").specificActivities,
    "",
  );
  assert.equal(
    consentForUnit(details, {}, "cluj").commonActivities,
    "Program comun",
  );
  assert.equal(
    consentForUnit(details, undefined, "cluj").specificActivities,
    "Text vechi",
  );
});
