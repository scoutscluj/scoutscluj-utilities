export const PARENTAL_CONSENT_SCHEMA_VERSION = 1 as const;

export const branchCodes = ["lupisori", "temerari", "exploratori"] as const;
export type BranchCode = (typeof branchCodes)[number];

export const branchLabels: Record<BranchCode, string> = {
  lupisori: "Lupișori",
  temerari: "Temerari",
  exploratori: "Exploratori",
};

export const templateStatuses = ["draft", "active", "archived"] as const;
export type TemplateStatus = (typeof templateStatuses)[number];

export const publicationStatuses = ["active", "archived"] as const;
export type PublicationStatus = (typeof publicationStatuses)[number];

export const variableKeys = [
  "organization.name",
  "organization.address",
  "organization.email",
  "organization.phone",
  "activity.title",
  "activity.location",
  "activity.startDate",
  "activity.endDate",
  "activity.emergencyContactName",
  "activity.emergencyContactPhone",
  "branch.label",
  "branch.startDate",
  "branch.endDate",
] as const;
export type VariableKey = (typeof variableKeys)[number];

export const moduleKeys = [
  "transport",
  "accommodation",
  "activity_catalog",
  "water",
  "tools",
  "fire_cooking_blacksmithing",
  "hiking",
  "first_aid",
  "food_allergies",
  "equipment",
  "conduct_sfh",
] as const;
export type ModuleKey = (typeof moduleKeys)[number];

export const formFieldTypes = [
  "short_text",
  "long_text",
  "date",
  "number",
  "phone",
  "email",
  "yes_no",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "acknowledgement",
  "repeating_group",
  "signature",
  "read_only",
] as const;
export type FormFieldType = (typeof formFieldTypes)[number];

export type FormFieldOption = { value: string; label: string };

export type FormField = {
  code: string;
  type: FormFieldType;
  label: string;
  helpText?: string;
  required?: boolean;
  options?: FormFieldOption[];
  handwrittenLines?: number;
  digital?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  children?: FormField[];
};

export type InlineMark =
  | { type: "bold" | "italic" | "underline" }
  | { type: "link"; href: string };

export type InlineNode = {
  type: "text";
  text: string;
  marks?: InlineMark[];
};

export type ListItemNode = {
  type: "listItem";
  content: Array<ParagraphNode | BulletListNode | OrderedListNode>;
};

export type ParagraphNode = { type: "paragraph"; content?: InlineNode[] };
export type HeadingNode = {
  type: "heading";
  level: 1 | 2 | 3;
  content?: InlineNode[];
};
export type CalloutNode = {
  type: "callout";
  tone: "info" | "warning" | "important";
  content: ParagraphNode[];
};
export type BulletListNode = { type: "bulletList"; content: ListItemNode[] };
export type OrderedListNode = { type: "orderedList"; content: ListItemNode[] };
export type TableCellNode = { type: "tableCell"; content: ParagraphNode[] };
export type TableRowNode = { type: "tableRow"; content: TableCellNode[] };
export type TableNode = { type: "table"; content: TableRowNode[] };
export type SeparatorNode = { type: "separator" };
export type PageBreakNode = { type: "pageBreak" };
export type AssetNode = {
  type: "asset";
  assetId: number;
  alt: string;
  widthPercent?: number;
};
export type VariableNode = { type: "variable"; key: VariableKey };
export type FormFieldNode = { type: "formField"; field: FormField };
export type ModuleNode = { type: "module"; key: ModuleKey };

export type DocumentBlock =
  | ParagraphNode
  | HeadingNode
  | CalloutNode
  | BulletListNode
  | OrderedListNode
  | TableNode
  | SeparatorNode
  | PageBreakNode
  | AssetNode
  | VariableNode
  | FormFieldNode
  | ModuleNode;

export type TemplateDocument = {
  type: "doc";
  content: DocumentBlock[];
};

export type LayoutSettings = {
  pageSize: "letter";
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  baseFontSizePt: number;
  headerAssetIds: number[];
};

export type OrganizationSettings = {
  name: string;
  legalName?: string;
  address: string;
  email: string;
  phone: string;
  website?: string;
};

export type BranchDraft = {
  enabled: boolean;
  startDate: string;
  endDate: string;
  ageRange?: string;
  outboundTransport: string;
  returnTransport: string;
  pickupDetails: string;
  activities: string[];
  equipment: string[];
};

export type ToggleDetails = { enabled: boolean; details: string };

export type OrganizerDraft = {
  schemaVersion: typeof PARENTAL_CONSENT_SCHEMA_VERSION;
  general: {
    title: string;
    location: string;
    address: string;
    startDate: string;
    endDate: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
  };
  branches: Record<BranchCode, BranchDraft>;
  accommodation: ToggleDetails & { overnight: boolean };
  water: ToggleDetails & {
    activities: string[];
    raftConstructionOnly: boolean;
  };
  tools: ToggleDetails & { branches: BranchCode[] };
  fireCookingBlacksmithing: ToggleDetails & { branches: BranchCode[] };
  hiking: ToggleDetails & { overnightShelter: boolean };
  firstAid: {
    responsiblePeople: string[];
    facility: string;
    details: string;
  };
  foodAllergies: {
    mealsProvided: boolean;
    allergyHandling: string;
    details: string;
  };
  conductSfh: {
    regulationUrl: string;
    safeFromHarmDetails: string;
    details: string;
  };
};

export type ValidationSeverity = "error" | "warning";
export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
  severity: ValidationSeverity;
};

export type TemplateSnapshot = {
  id: number;
  version: number;
  name: string;
  schemaVersion: number;
  document: TemplateDocument;
  layout: LayoutSettings;
};

export type PublicationSnapshot = {
  activityId: number;
  draftRevision: number;
  branchCodes: BranchCode[];
  organizerDraft: OrganizerDraft;
  organization: OrganizationSettings;
  template: TemplateSnapshot;
};
