import assert from "node:assert/strict";
import { test } from "node:test";
import { compareValues } from "./compare";

test("TEST 1 exact match", () => {
  const result = compareValues(
    "company_name",
    "APPLICATION",
    "ABC Technologies Pvt Ltd",
    "GST_VERIFICATION",
    "ABC Technologies Pvt Ltd"
  );
  assert.equal(result.classification, "EXACT_MATCH");
});

test("TEST 2 legal suffix variation", () => {
  const result = compareValues(
    "company_name",
    "APPLICATION",
    "ABC Technologies Pvt Ltd",
    "GST_VERIFICATION",
    "ABC Technologies Private Limited"
  );
  assert.equal(result.classification, "LIKELY_SAME_ENTITY");
});

test("TEST 3 formatting variation", () => {
  const result = compareValues(
    "company_name",
    "APPLICATION",
    "ABC   Technologies PVT. LTD.",
    "GST_VERIFICATION",
    "abc technologies private limited"
  );
  assert.equal(result.classification, "LIKELY_SAME_ENTITY");
});

test("TEST 4 possible mismatch", () => {
  const result = compareValues(
    "company_name",
    "GST_VERIFICATION",
    "Sandbox Supplies Pvt Ltd",
    "OEM_VERIFICATION",
    "Different Medical Devices Pvt Ltd"
  );
  assert.equal(result.classification, "POSSIBLE_MISMATCH");
});

test("TEST 5 strong mismatch on identifiers", () => {
  const result = compareValues(
    "gstin",
    "APPLICATION",
    "27SANDBOX0001Z5",
    "GST_VERIFICATION",
    "99UNKNOWN0000X1"
  );
  assert.equal(result.classification, "STRONG_MISMATCH");
});

test("TEST 6 missing value", () => {
  const result = compareValues("company_name", "APPLICATION", "", "GST_VERIFICATION", "Sandbox Supplies Pvt Ltd");
  assert.equal(result.classification, "INSUFFICIENT_EVIDENCE");
});

test("TEST 7 GSTIN exact match", () => {
  const result = compareValues("gstin", "APPLICATION", "27SANDBOX0001Z5", "GST_VERIFICATION", "27SANDBOX0001Z5");
  assert.equal(result.classification, "EXACT_MATCH");
});

test("TEST 8 GSTIN mismatch", () => {
  const result = compareValues("gstin", "APPLICATION", "27SANDBOX0001Z5", "GST_VERIFICATION", "27SANDBOX0002Z5");
  assert.equal(result.classification, "STRONG_MISMATCH");
});
