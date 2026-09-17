import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateRequirement } from "./rules";
import type { EvaluateRequirementInput } from "./types";

function base(overrides: Partial<EvaluateRequirementInput> = {}): EvaluateRequirementInput {
  return {
    requirement: {
      id: 1,
      name: "Requirement",
      tenderClause: "clause",
      mandatory: true,
      verificationMethod: "DOCUMENT",
      ruleType: "EXISTS",
    },
    application: { gstin: "", pan: "", oem: "", udyam: "" },
    verificationResult: null,
    entityResolutionResults: [],
    documentCount: 0,
    ...overrides,
  };
}

test("EXISTS document present is PASS", () => {
  const result = evaluateRequirement(base({ documentCount: 1 }));
  assert.equal(result.status, "PASS");
  assert.equal(result.reasonCode, "REQUIRED_DOCUMENT_PRESENT");
});

test("EXISTS document missing is PENDING", () => {
  const result = evaluateRequirement(base({ documentCount: 0 }));
  assert.equal(result.status, "PENDING");
  assert.equal(result.reasonCode, "REQUIRED_DOCUMENT_MISSING");
});

test("EXISTS verification missing is PENDING", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "GST",
        tenderClause: "clause",
        mandatory: true,
        verificationMethod: "GST",
        ruleType: "EXISTS",
      },
    })
  );
  assert.equal(result.status, "PENDING");
  assert.equal(result.reasonCode, "VERIFICATION_PENDING");
});

test("EXISTS verified evidence is PASS", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "GST",
        tenderClause: "clause",
        mandatory: true,
        verificationMethod: "GST",
        ruleType: "EXISTS",
      },
      verificationResult: { status: "VERIFIED", method: "GST", data: { gstin: "27SANDBOX0001Z5" } },
    })
  );
  assert.equal(result.status, "PASS");
  assert.equal(result.reasonCode, "VERIFICATION_PRESENT");
});

test("EXISTS NOT_FOUND is PENDING not fraud", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "GST",
        tenderClause: "clause",
        mandatory: true,
        verificationMethod: "GST",
        ruleType: "EXISTS",
      },
      verificationResult: { status: "NOT_FOUND", method: "GST", data: {} },
    })
  );
  assert.equal(result.status, "PENDING");
  assert.equal(result.reasonCode, "VERIFICATION_NOT_FOUND");
});

test("EXISTS INSUFFICIENT_DATA is PENDING", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "GST",
        tenderClause: "clause",
        mandatory: true,
        verificationMethod: "GST",
        ruleType: "EXISTS",
      },
      verificationResult: { status: "INSUFFICIENT_DATA", method: "GST", data: {} },
    })
  );
  assert.equal(result.status, "PENDING");
});

test("EXACT_MATCH matching GSTIN is PASS", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "GSTIN",
        tenderClause: "clause",
        mandatory: true,
        verificationMethod: "GST",
        ruleType: "EXACT_MATCH",
      },
      application: { gstin: "27SANDBOX0001Z5", pan: "", oem: "", udyam: "" },
      verificationResult: { status: "VERIFIED", method: "GST", data: { gstin: "27SANDBOX0001Z5" } },
    })
  );
  assert.equal(result.status, "PASS");
  assert.equal(result.reasonCode, "EXACT_VALUE_MATCH");
});

test("EXACT_MATCH formatting variation on GSTIN is PASS", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "GSTIN",
        tenderClause: "clause",
        mandatory: true,
        verificationMethod: "GST",
        ruleType: "EXACT_MATCH",
      },
      application: { gstin: "27sandbox0001z5", pan: "", oem: "", udyam: "" },
      verificationResult: { status: "VERIFIED", method: "GST", data: { gstin: "27SANDBOX0001Z5" } },
    })
  );
  assert.equal(result.status, "PASS");
});

test("EXACT_MATCH different GSTIN is FAIL", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "GSTIN",
        tenderClause: "clause",
        mandatory: true,
        verificationMethod: "GST",
        ruleType: "EXACT_MATCH",
      },
      application: { gstin: "27SANDBOX0001Z5", pan: "", oem: "", udyam: "" },
      verificationResult: { status: "VERIFIED", method: "GST", data: { gstin: "27SANDBOX0002Z5" } },
    })
  );
  assert.equal(result.status, "FAIL");
  assert.equal(result.reasonCode, "EXACT_VALUE_MISMATCH");
});

test("MATCH EXACT_MATCH is PASS", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "OEM",
        tenderClause: "clause",
        mandatory: true,
        verificationMethod: "OEM",
        ruleType: "MATCH",
      },
      verificationResult: { status: "VERIFIED", method: "OEM", data: { oemName: "Sandbox Medical Devices" } },
      entityResolutionResults: [
        {
          field: "oem",
          sourceA: "APPLICATION",
          sourceB: "OEM_VERIFICATION",
          classification: "EXACT_MATCH",
        },
      ],
    })
  );
  assert.equal(result.status, "PASS");
  assert.equal(result.reasonCode, "ENTITY_EXACT_MATCH");
});

test("MATCH LIKELY_SAME_ENTITY is REVIEW", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "GST",
        tenderClause: "clause",
        mandatory: true,
        verificationMethod: "GST",
        ruleType: "MATCH",
      },
      verificationResult: { status: "VERIFIED", method: "GST", data: { legalName: "Sandbox Supplies Private Limited" } },
      entityResolutionResults: [
        {
          field: "company_name",
          sourceA: "GST_VERIFICATION",
          sourceB: "OEM_VERIFICATION",
          classification: "LIKELY_SAME_ENTITY",
        },
      ],
    })
  );
  assert.equal(result.status, "REVIEW");
  assert.equal(result.reasonCode, "ENTITY_LIKELY_SAME");
});

test("MATCH POSSIBLE_MISMATCH is REVIEW", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "OEM",
        tenderClause: "clause",
        mandatory: true,
        verificationMethod: "OEM",
        ruleType: "MATCH",
      },
      verificationResult: { status: "VERIFIED", method: "OEM", data: { oemName: "Different Medical Devices Pvt Ltd" } },
      entityResolutionResults: [
        {
          field: "company_name",
          sourceA: "GST_VERIFICATION",
          sourceB: "OEM_VERIFICATION",
          classification: "POSSIBLE_MISMATCH",
        },
      ],
    })
  );
  assert.equal(result.status, "REVIEW");
  assert.equal(result.reasonCode, "ENTITY_POSSIBLE_MISMATCH");
});

test("MATCH STRONG_MISMATCH is FAIL", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "GST",
        tenderClause: "clause",
        mandatory: true,
        verificationMethod: "GST",
        ruleType: "MATCH",
      },
      verificationResult: { status: "VERIFIED", method: "GST", data: { gstin: "27SANDBOX0001Z5" } },
      entityResolutionResults: [
        {
          field: "gstin",
          sourceA: "APPLICATION",
          sourceB: "GST_VERIFICATION",
          classification: "STRONG_MISMATCH",
        },
      ],
    })
  );
  assert.equal(result.status, "FAIL");
  assert.equal(result.reasonCode, "ENTITY_STRONG_MISMATCH");
});

test("MATCH INSUFFICIENT_EVIDENCE is PENDING", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "GST",
        tenderClause: "clause",
        mandatory: true,
        verificationMethod: "GST",
        ruleType: "MATCH",
      },
      verificationResult: { status: "VERIFIED", method: "GST", data: {} },
      entityResolutionResults: [
        {
          field: "company_name",
          sourceA: "GST_VERIFICATION",
          sourceB: "OEM_VERIFICATION",
          classification: "INSUFFICIENT_EVIDENCE",
        },
      ],
    })
  );
  assert.equal(result.status, "PENDING");
});

test("MANUAL_REVIEW is REVIEW", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "Manual",
        tenderClause: "clause",
        mandatory: false,
        verificationMethod: "MANUAL",
        ruleType: "MANUAL_REVIEW",
      },
    })
  );
  assert.equal(result.status, "REVIEW");
  assert.equal(result.reasonCode, "MANUAL_REVIEW_REQUIRED");
});

test("verification MANUAL_REVIEW is REVIEW", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "GST",
        tenderClause: "clause",
        mandatory: true,
        verificationMethod: "GST",
        ruleType: "EXISTS",
      },
      verificationResult: { status: "MANUAL_REVIEW", method: "GST", data: {} },
    })
  );
  assert.equal(result.status, "REVIEW");
});

test("unsupported rule type is REVIEW", () => {
  const result = evaluateRequirement(
    base({
      requirement: {
        id: 1,
        name: "Odd",
        tenderClause: "clause",
        mandatory: true,
        verificationMethod: "GST",
        ruleType: "UNKNOWN",
      },
    })
  );
  assert.equal(result.status, "REVIEW");
  assert.equal(result.reasonCode, "UNSUPPORTED_RULE_TYPE");
});
