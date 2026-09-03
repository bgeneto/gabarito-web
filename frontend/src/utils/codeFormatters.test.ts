import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatPublicCode,
  validatePublicCode,
  formatReceiptCode,
  validateReceiptCode,
} from "./codeFormatters";

test("codeFormatters - formatPublicCode", async (t) => {
  await t.test("empty or undefined input returns empty string", () => {
    assert.equal(formatPublicCode(""), "");
    assert.equal(formatPublicCode(null as any), "");
  });

  await t.test("formats incremental input with auto-inserted hyphen", () => {
    assert.equal(formatPublicCode("g"), "G");
    assert.equal(formatPublicCode("g2"), "G2");
    assert.equal(formatPublicCode("g26"), "G26");
    assert.equal(formatPublicCode("g26d"), "G26-D");
    assert.equal(formatPublicCode("g26dnem"), "G26-DNEM");
    assert.equal(formatPublicCode("g26dnem9g"), "G26-DNEM9G");
  });

  await t.test("handles input that already contains hyphens or symbols", () => {
    assert.equal(formatPublicCode("G26-DNEM9G"), "G26-DNEM9G");
    assert.equal(formatPublicCode("g26-dnem9g"), "G26-DNEM9G");
    assert.equal(formatPublicCode("G26--DNEM9G"), "G26-DNEM9G");
    assert.equal(formatPublicCode("g26 dnem 9g"), "G26-DNEM9G");
  });

  await t.test("truncates beyond 9 alphanumeric characters", () => {
    assert.equal(formatPublicCode("G26DNEM9GEXTRA"), "G26-DNEM9G");
  });
});

test("codeFormatters - validatePublicCode", async (t) => {
  await t.test("validates valid codes correctly", () => {
    assert.equal(validatePublicCode("G26-DNEM9G"), true);
    assert.equal(validatePublicCode("g26-dnem9g"), true);
    assert.equal(validatePublicCode("G25-000000"), true);
    assert.equal(validatePublicCode("G26-ZZZZZZ"), true);
  });

  await t.test("rejects invalid codes", () => {
    assert.equal(validatePublicCode(""), false);
    assert.equal(validatePublicCode("G26DNEM9G"), false); // missing hyphen
    assert.equal(validatePublicCode("G2-DNEM9G"), false); // wrong prefix
    assert.equal(validatePublicCode("A26-DNEM9G"), false); // doesn't start with G
    assert.equal(validatePublicCode("G26-DNEM9"), false); // too short
    assert.equal(validatePublicCode("G26-DNEM9G1"), false); // too long
    assert.equal(validatePublicCode("G26-DNEM_G"), false); // invalid char
  });
});

test("codeFormatters - formatReceiptCode", async (t) => {
  await t.test("empty input returns empty string", () => {
    assert.equal(formatReceiptCode(""), "");
  });

  await t.test("uppercases and truncates to 6 characters", () => {
    assert.equal(formatReceiptCode("p9z2ju"), "P9Z2JU");
    assert.equal(formatReceiptCode("P9Z2JUEXTRA"), "P9Z2JU");
    assert.equal(formatReceiptCode("p9-z2 ju"), "P9Z2JU");
  });

  await t.test("extracts code from submission URL", () => {
    assert.equal(
      formatReceiptCode("https://gabarito.web/submissao/A7K9QF"),
      "A7K9QF",
    );
    assert.equal(formatReceiptCode("/submissao/p9z2ju"), "P9Z2JU");
  });
});

test("codeFormatters - validateReceiptCode", async (t) => {
  await t.test("validates 6-character alphanumeric code", () => {
    assert.equal(validateReceiptCode("A7K9QF"), true);
    assert.equal(validateReceiptCode("a7k9qf"), true);
    assert.equal(validateReceiptCode("000000"), true);
    assert.equal(validateReceiptCode("ZZZZZZ"), true);
  });

  await t.test("rejects invalid lengths or characters", () => {
    assert.equal(validateReceiptCode(""), false);
    assert.equal(validateReceiptCode("A7K9Q"), false); // 5 chars
    assert.equal(validateReceiptCode("A7K9QFA"), false); // 7 chars
    assert.equal(validateReceiptCode("A7K-QF"), false); // symbol
    assert.equal(validateReceiptCode("A7K QF"), false); // space
  });
});
