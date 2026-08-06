import assert from "node:assert/strict";
import test from "node:test";
import {
  createRepresentativeOrganizerDraft,
  initialTemplateDocument,
} from "./fixtures.js";
import {
  canonicalJson,
  changedPaths,
  validateOrganizerDraft,
  validateTemplateDocument,
} from "./validation.js";

test("the representative organizer draft is publishable", () => {
  const issues = validateOrganizerDraft(createRepresentativeOrganizerDraft());
  assert.equal(issues.filter((entry) => entry.severity === "error").length, 0);
});

test("template validation rejects unknown assets and unsafe links", () => {
  const issues = validateTemplateDocument(
    {
      ...initialTemplateDocument,
      content: [
        { type: "asset", assetId: 42, alt: "Remote" },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "bad",
              marks: [{ type: "link", href: "javascript:alert(1)" }],
            },
          ],
        },
      ],
    },
    new Set(),
  );
  assert.deepEqual(
    issues.map((entry) => entry.code),
    ["unknown_asset", "unsafe_link"],
  );
});

test("template validation rejects arbitrary and malformed nested nodes", () => {
  const issues = validateTemplateDocument({
    type: "doc",
    content: [
      { type: "rawHtml", html: "<script>alert(1)</script>" },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "asset", assetId: 1, alt: "not allowed in a list" },
            ],
          },
        ],
      },
      {
        type: "paragraph",
        content: [{ type: "image", src: "https://example.org/tracker.png" }],
      },
    ],
  } as never);

  assert.deepEqual(
    issues.map((entry) => entry.code),
    [
      "unsupported_block",
      "unsupported_nested_block",
      "unsupported_inline_node",
    ],
  );
});

test("template validation handles malformed form fields without throwing", () => {
  const issues = validateTemplateDocument({
    type: "doc",
    content: [{ type: "formField", field: { type: "short_text" } }],
  } as never);
  assert.deepEqual(
    issues.map((entry) => entry.code),
    ["invalid_field_code", "required"],
  );
});

test("changed paths and canonical JSON are stable", () => {
  assert.deepEqual(changedPaths({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } }), [
    "b.c",
  ]);
  assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }));
});
