import {
  PARENTAL_CONSENT_SCHEMA_VERSION,
  branchCodes,
  branchLabels,
  type LayoutSettings,
  type OrganizerDraft,
  type TemplateDocument,
} from "./contracts.js";

const emptyBranch = () => ({
  enabled: false,
  startDate: "",
  endDate: "",
  outboundTransport: "",
  returnTransport: "",
  pickupDetails: "",
  activities: [],
  equipment: [],
});

export const createEmptyOrganizerDraft = (): OrganizerDraft => ({
  schemaVersion: PARENTAL_CONSENT_SCHEMA_VERSION,
  general: {
    title: "",
    location: "",
    address: "",
    startDate: "",
    endDate: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  },
  branches: {
    lupisori: emptyBranch(),
    temerari: emptyBranch(),
    exploratori: emptyBranch(),
  },
  accommodation: { enabled: false, overnight: false, details: "" },
  water: {
    enabled: false,
    activities: [],
    raftConstructionOnly: true,
    details: "",
  },
  tools: { enabled: false, branches: [], details: "" },
  fireCookingBlacksmithing: { enabled: false, branches: [], details: "" },
  hiking: { enabled: false, overnightShelter: false, details: "" },
  firstAid: { responsiblePeople: [], facility: "", details: "" },
  foodAllergies: { mealsProvided: false, allergyHandling: "", details: "" },
  conductSfh: { regulationUrl: "", safeFromHarmDetails: "", details: "" },
});

export const createRepresentativeOrganizerDraft = (): OrganizerDraft => {
  const draft = createEmptyOrganizerDraft();
  draft.general = {
    title: "Cântul Vâlvelor",
    location: "Beliș",
    address: "Zona de campare Beliș, județul Cluj",
    startDate: "2026-08-10",
    endDate: "2026-08-16",
    emergencyContactName: "Coordonator activitate",
    emergencyContactPhone: "0700 000 000",
  };
  branchCodes.forEach((code, index) => {
    draft.branches[code] = {
      enabled: true,
      startDate: `2026-08-${String(10 + index).padStart(2, "0")}`,
      endDate: "2026-08-16",
      outboundTransport: `Autocar – plecare ${branchLabels[code]}`,
      returnTransport: "Autocar",
      pickupDetails: "Detaliile se comunică de coordonator.",
      activities: [
        `Program specific ${branchLabels[code]}`,
        "Jocuri și ateliere",
      ],
      equipment: ["Uniformă", "Pelerină de ploaie", "Recipient pentru apă"],
    };
  });
  draft.accommodation = {
    enabled: true,
    overnight: true,
    details: "Cazare la cort, pe patrule.",
  };
  draft.water = {
    enabled: true,
    activities: ["Construcție plută"],
    raftConstructionOnly: true,
    details:
      "Pluta este construită la mal și nu este folosită pentru transport pe apă.",
  };
  draft.tools = {
    enabled: true,
    branches: ["temerari", "exploratori"],
    details: "Unelte folosite supravegheat.",
  };
  draft.firstAid = {
    responsiblePeople: ["Responsabil prim ajutor"],
    facility: "Cea mai apropiată unitate medicală din Huedin",
    details: "",
  };
  return draft;
};

export const defaultLayoutSettings: LayoutSettings = {
  pageSize: "letter",
  marginTopMm: 18,
  marginRightMm: 14,
  marginBottomMm: 16,
  marginLeftMm: 14,
  baseFontSizePt: 10,
  headerAssetIds: [],
};

export const initialTemplateDocument: TemplateDocument = {
  type: "doc",
  content: [
    {
      type: "heading",
      level: 1,
      content: [{ type: "text", text: "Acord parental" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Activitate", marks: [{ type: "bold" }] },
      ],
    },
    { type: "variable", key: "activity.title" },
    { type: "variable", key: "branch.label" },
    { type: "module", key: "transport" },
    { type: "module", key: "accommodation" },
    { type: "module", key: "activity_catalog" },
    { type: "module", key: "water" },
    { type: "module", key: "tools" },
    { type: "module", key: "fire_cooking_blacksmithing" },
    { type: "module", key: "hiking" },
    { type: "module", key: "first_aid" },
    { type: "module", key: "food_allergies" },
    { type: "module", key: "equipment" },
    { type: "module", key: "conduct_sfh" },
    { type: "separator" },
    {
      type: "formField",
      field: {
        code: "participant_name",
        type: "short_text",
        label: "Numele participantului",
        required: true,
      },
    },
    {
      type: "formField",
      field: {
        code: "guardian_name",
        type: "short_text",
        label: "Numele părintelui/tutorelui",
        required: true,
      },
    },
    {
      type: "formField",
      field: {
        code: "guardian_phone",
        type: "phone",
        label: "Telefon",
        required: true,
      },
    },
    {
      type: "formField",
      field: {
        code: "medical_notes",
        type: "long_text",
        label: "Informații medicale și alergii relevante",
        handwrittenLines: 4,
      },
    },
    {
      type: "formField",
      field: {
        code: "acknowledgement",
        type: "acknowledgement",
        label:
          "Am citit informațiile despre activitate și sunt de acord cu participarea copilului.",
        required: true,
      },
    },
    {
      type: "formField",
      field: {
        code: "guardian_signature",
        type: "signature",
        label: "Semnătura părintelui/tutorelui",
        required: true,
      },
    },
  ],
};
