import {
  branchCodes,
  formFieldTypes,
  moduleKeys,
  variableKeys,
  type BranchCode,
  type FormField,
  type OrganizerDraft,
  type TemplateDocument,
  type ValidationIssue,
} from "./contracts.js";

const fieldCodePattern = /^[a-z][a-z0-9_]{1,63}$/;
const safeLinkPattern = /^(https?:|mailto:|tel:)/i;

const issue = (
  path: string,
  code: string,
  message: string,
  severity: ValidationIssue["severity"] = "error",
): ValidationIssue => ({ path, code, message, severity });

const validateField = (
  field: FormField | unknown,
  path: string,
  seenCodes: Set<string>,
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (!field || typeof field !== "object") {
    return [issue(path, "invalid_field", "Câmpul de formular nu este valid.")];
  }
  const candidate = field as Partial<FormField>;
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const type = typeof candidate.type === "string" ? candidate.type : "";
  if (!fieldCodePattern.test(code)) {
    issues.push(
      issue(
        `${path}.code`,
        "invalid_field_code",
        "Codul câmpului trebuie să folosească litere mici, cifre și underscore.",
      ),
    );
  } else if (seenCodes.has(code)) {
    issues.push(
      issue(
        `${path}.code`,
        "duplicate_field_code",
        "Codul câmpului trebuie să fie unic.",
      ),
    );
  }
  seenCodes.add(code);

  if (!formFieldTypes.includes(type as (typeof formFieldTypes)[number])) {
    issues.push(
      issue(
        `${path}.type`,
        "unsupported_field_type",
        "Tipul câmpului nu este acceptat.",
      ),
    );
  }
  if (typeof candidate.label !== "string" || !candidate.label.trim()) {
    issues.push(
      issue(`${path}.label`, "required", "Eticheta câmpului este obligatorie."),
    );
  }
  if (
    ["single_choice", "multiple_choice", "dropdown"].includes(type) &&
    (!Array.isArray(candidate.options) || candidate.options.length < 2)
  ) {
    issues.push(
      issue(
        `${path}.options`,
        "missing_options",
        "Câmpul de selecție are nevoie de cel puțin două opțiuni.",
      ),
    );
  }
  if (type === "repeating_group") {
    if (!Array.isArray(candidate.children) || !candidate.children.length) {
      issues.push(
        issue(
          `${path}.children`,
          "missing_children",
          "Grupul repetabil are nevoie de cel puțin un câmp.",
        ),
      );
    } else {
      candidate.children.forEach((child, index) =>
        issues.push(
          ...validateField(child, `${path}.children.${index}`, seenCodes),
        ),
      );
    }
  }
  return issues;
};

const validateInlineContent = (
  content: unknown,
  path: string,
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (content === undefined) return issues;
  if (!Array.isArray(content)) {
    return [
      issue(path, "invalid_inline_content", "Conținutul text nu este valid."),
    ];
  }
  content.forEach((inline, index) => {
    const inlinePath = `${path}.${index}`;
    if (
      !inline ||
      typeof inline !== "object" ||
      (inline as { type?: unknown }).type !== "text" ||
      typeof (inline as { text?: unknown }).text !== "string"
    ) {
      issues.push(
        issue(
          inlinePath,
          "unsupported_inline_node",
          "Nodul inline nu este acceptat.",
        ),
      );
      return;
    }
    const marks = (inline as { marks?: unknown }).marks;
    if (marks === undefined) return;
    if (!Array.isArray(marks)) {
      issues.push(
        issue(
          `${inlinePath}.marks`,
          "invalid_marks",
          "Formatarea inline nu este validă.",
        ),
      );
      return;
    }
    marks.forEach((mark, markIndex) => {
      const markPath = `${inlinePath}.marks.${markIndex}`;
      if (!mark || typeof mark !== "object") {
        issues.push(
          issue(
            markPath,
            "unsupported_mark",
            "Formatarea inline nu este acceptată.",
          ),
        );
        return;
      }
      const markType = (mark as { type?: unknown }).type;
      if (!["bold", "italic", "underline", "link"].includes(String(markType))) {
        issues.push(
          issue(
            markPath,
            "unsupported_mark",
            "Formatarea inline nu este acceptată.",
          ),
        );
      } else if (
        markType === "link" &&
        (typeof (mark as { href?: unknown }).href !== "string" ||
          !safeLinkPattern.test((mark as { href: string }).href))
      ) {
        issues.push(
          issue(
            `${markPath}.href`,
            "unsafe_link",
            "Sunt permise doar linkuri HTTP(S), mailto și tel.",
          ),
        );
      }
    });
  });
  return issues;
};

const supportedBlocks = new Set([
  "paragraph",
  "heading",
  "callout",
  "bulletList",
  "orderedList",
  "table",
  "separator",
  "pageBreak",
  "asset",
  "variable",
  "formField",
  "module",
]);

const validateBlock = (
  block: unknown,
  path: string,
  approvedAssetIds: ReadonlySet<number>,
  seenCodes: Set<string>,
  nested = false,
): ValidationIssue[] => {
  if (!block || typeof block !== "object") {
    return [issue(path, "invalid_block", "Blocul documentului nu este valid.")];
  }
  const candidate = block as Record<string, unknown>;
  const type = typeof candidate.type === "string" ? candidate.type : "";
  if (!supportedBlocks.has(type)) {
    return [
      issue(
        `${path}.type`,
        "unsupported_block",
        "Tipul blocului nu este acceptat.",
      ),
    ];
  }
  if (nested && !["paragraph", "bulletList", "orderedList"].includes(type)) {
    return [
      issue(
        `${path}.type`,
        "unsupported_nested_block",
        "Blocul nu este acceptat în această structură.",
      ),
    ];
  }
  const issues: ValidationIssue[] = [];
  if (type === "paragraph" || type === "heading") {
    issues.push(...validateInlineContent(candidate.content, `${path}.content`));
    if (type === "heading" && ![1, 2, 3].includes(Number(candidate.level))) {
      issues.push(
        issue(
          `${path}.level`,
          "invalid_heading_level",
          "Sunt acceptate doar heading-urile H1–H3.",
        ),
      );
    }
  } else if (type === "callout") {
    if (!["info", "warning", "important"].includes(String(candidate.tone))) {
      issues.push(
        issue(
          `${path}.tone`,
          "invalid_callout_tone",
          "Tipul callout-ului nu este valid.",
        ),
      );
    }
    if (!Array.isArray(candidate.content) || !candidate.content.length) {
      issues.push(
        issue(
          `${path}.content`,
          "invalid_callout_content",
          "Callout-ul are nevoie de text.",
        ),
      );
    } else {
      candidate.content.forEach((child, index) => {
        if ((child as { type?: unknown })?.type !== "paragraph") {
          issues.push(
            issue(
              `${path}.content.${index}.type`,
              "unsupported_callout_block",
              "Callout-ul acceptă doar paragrafe.",
            ),
          );
        } else {
          issues.push(
            ...validateBlock(
              child,
              `${path}.content.${index}`,
              approvedAssetIds,
              seenCodes,
            ),
          );
        }
      });
    }
  } else if (type === "bulletList" || type === "orderedList") {
    if (!Array.isArray(candidate.content) || !candidate.content.length) {
      issues.push(
        issue(
          `${path}.content`,
          "invalid_list",
          "Lista are nevoie de cel puțin un element.",
        ),
      );
    } else {
      candidate.content.forEach((item, index) => {
        const itemPath = `${path}.content.${index}`;
        const itemContent = (item as { content?: unknown })?.content;
        if (
          (item as { type?: unknown })?.type !== "listItem" ||
          !Array.isArray(itemContent)
        ) {
          issues.push(
            issue(
              itemPath,
              "invalid_list_item",
              "Elementul listei nu este valid.",
            ),
          );
          return;
        }
        itemContent.forEach((child, childIndex) =>
          issues.push(
            ...validateBlock(
              child,
              `${itemPath}.content.${childIndex}`,
              approvedAssetIds,
              seenCodes,
              true,
            ),
          ),
        );
      });
    }
  } else if (type === "table") {
    if (!Array.isArray(candidate.content) || !candidate.content.length) {
      issues.push(
        issue(
          `${path}.content`,
          "invalid_table",
          "Tabelul are nevoie de cel puțin un rând.",
        ),
      );
    } else {
      candidate.content.forEach((row, rowIndex) => {
        const rowPath = `${path}.content.${rowIndex}`;
        const cells = (row as { content?: unknown })?.content;
        if (
          (row as { type?: unknown })?.type !== "tableRow" ||
          !Array.isArray(cells) ||
          !cells.length
        ) {
          issues.push(
            issue(
              rowPath,
              "invalid_table_row",
              "Rândul tabelului nu este valid.",
            ),
          );
          return;
        }
        cells.forEach((cell, cellIndex) => {
          const cellPath = `${rowPath}.content.${cellIndex}`;
          const paragraphs = (cell as { content?: unknown })?.content;
          if (
            (cell as { type?: unknown })?.type !== "tableCell" ||
            !Array.isArray(paragraphs)
          ) {
            issues.push(
              issue(
                cellPath,
                "invalid_table_cell",
                "Celula tabelului nu este validă.",
              ),
            );
            return;
          }
          paragraphs.forEach((paragraph, paragraphIndex) => {
            if ((paragraph as { type?: unknown })?.type !== "paragraph") {
              issues.push(
                issue(
                  `${cellPath}.content.${paragraphIndex}`,
                  "unsupported_table_block",
                  "Celulele acceptă doar paragrafe.",
                ),
              );
            } else {
              issues.push(
                ...validateBlock(
                  paragraph,
                  `${cellPath}.content.${paragraphIndex}`,
                  approvedAssetIds,
                  seenCodes,
                ),
              );
            }
          });
        });
      });
    }
  } else if (type === "asset") {
    if (
      !Number.isInteger(candidate.assetId) ||
      !approvedAssetIds.has(Number(candidate.assetId))
    ) {
      issues.push(
        issue(
          `${path}.assetId`,
          "unknown_asset",
          "Asset-ul nu există în biblioteca aprobată.",
        ),
      );
    }
  } else if (
    type === "variable" &&
    !variableKeys.includes(candidate.key as never)
  ) {
    issues.push(
      issue(`${path}.key`, "unknown_variable", "Variabila nu este acceptată."),
    );
  } else if (
    type === "module" &&
    !moduleKeys.includes(candidate.key as never)
  ) {
    issues.push(
      issue(
        `${path}.key`,
        "unknown_module",
        "Modulul condițional nu este acceptat.",
      ),
    );
  } else if (type === "formField") {
    issues.push(...validateField(candidate.field, `${path}.field`, seenCodes));
  }
  return issues;
};

export const validateTemplateDocument = (
  document: TemplateDocument,
  approvedAssetIds: ReadonlySet<number> = new Set(),
): ValidationIssue[] => {
  if (
    !document ||
    document.type !== "doc" ||
    !Array.isArray(document.content)
  ) {
    return [
      issue(
        "document",
        "invalid_document",
        "Documentul template nu este valid.",
      ),
    ];
  }

  const issues: ValidationIssue[] = [];
  const seenCodes = new Set<string>();
  document.content.forEach((block, index) =>
    issues.push(
      ...validateBlock(
        block,
        `document.content.${index}`,
        approvedAssetIds,
        seenCodes,
      ),
    ),
  );
  return issues;
};

const required = (
  value: string,
  path: string,
  label: string,
): ValidationIssue[] =>
  value.trim() ? [] : [issue(path, "required", `${label} este obligatoriu.`)];

const validateBranch = (
  code: BranchCode,
  draft: OrganizerDraft,
): ValidationIssue[] => {
  const branch = draft.branches[code];
  if (!branch.enabled) return [];
  const path = `branches.${code}`;
  const issues = [
    ...required(branch.startDate, `${path}.startDate`, "Data de început"),
    ...required(branch.endDate, `${path}.endDate`, "Data de final"),
    ...required(branch.ageRange, `${path}.ageRange`, "Intervalul de vârstă"),
  ];
  if (branch.startDate && branch.endDate && branch.endDate < branch.startDate) {
    issues.push(
      issue(
        `${path}.endDate`,
        "invalid_date_range",
        "Data de final trebuie să fie după data de început.",
      ),
    );
  }
  if (!branch.activities.length) {
    issues.push(
      issue(
        `${path}.activities`,
        "empty_activities",
        "Adaugă cel puțin o activitate pentru ramură.",
        "warning",
      ),
    );
  }
  return issues;
};

export const validateOrganizerDraft = (
  draft: OrganizerDraft,
): ValidationIssue[] => {
  if (!draft || draft.schemaVersion !== 1) {
    return [
      issue(
        "schemaVersion",
        "unsupported_schema",
        "Versiunea configurației nu este acceptată.",
      ),
    ];
  }
  const issues = [
    ...required(draft.general.title, "general.title", "Titlul activității"),
    ...required(draft.general.location, "general.location", "Locația"),
    ...required(
      draft.general.emergencyContactName,
      "general.emergencyContactName",
      "Persoana de contact",
    ),
    ...required(
      draft.general.emergencyContactPhone,
      "general.emergencyContactPhone",
      "Telefonul de urgență",
    ),
  ];
  const enabledBranches = branchCodes.filter(
    (code) => draft.branches[code].enabled,
  );
  if (!enabledBranches.length) {
    issues.push(
      issue("branches", "no_branch", "Selectează cel puțin o ramură."),
    );
  }
  enabledBranches.forEach((code) =>
    issues.push(...validateBranch(code, draft)),
  );

  if (draft.water.enabled && !draft.water.activities.length) {
    issues.push(
      issue(
        "water.activities",
        "required",
        "Selectează activitățile desfășurate pe apă.",
      ),
    );
  }
  if (draft.tools.enabled && !draft.tools.branches.length) {
    issues.push(
      issue(
        "tools.branches",
        "required",
        "Selectează ramurile care folosesc unelte.",
      ),
    );
  }
  if (
    draft.fireCookingBlacksmithing.enabled &&
    !draft.fireCookingBlacksmithing.branches.length
  ) {
    issues.push(
      issue(
        "fireCookingBlacksmithing.branches",
        "required",
        "Selectează ramurile pentru activitățile cu foc.",
      ),
    );
  }
  if (!draft.firstAid.responsiblePeople.some((person) => person.trim())) {
    issues.push(
      issue(
        "firstAid.responsiblePeople",
        "required",
        "Adaugă un responsabil de prim ajutor.",
      ),
    );
  }
  return issues;
};

export const hasBlockingIssues = (issues: ValidationIssue[]) =>
  issues.some((entry) => entry.severity === "error");

export const changedPaths = (
  before: unknown,
  after: unknown,
  prefix = "",
): string[] => {
  if (Object.is(before, after)) return [];
  if (
    before === null ||
    after === null ||
    typeof before !== "object" ||
    typeof after !== "object" ||
    Array.isArray(before) ||
    Array.isArray(after)
  ) {
    return [prefix || "$"];
  }
  const left = before as Record<string, unknown>;
  const right = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].flatMap((key) =>
    changedPaths(left[key], right[key], prefix ? `${prefix}.${key}` : key),
  );
};

export const canonicalJson = (value: unknown): string => {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (entry && typeof entry === "object") {
      return Object.fromEntries(
        Object.entries(entry as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, child]) => [key, normalize(child)]),
      );
    }
    return entry;
  };
  return JSON.stringify(normalize(value));
};
