import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatPublicCode,
  validatePublicCode,
  formatReceiptCode,
  validateReceiptCode,
  formatAdminToken,
  validateAdminToken,
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

test("codeFormatters - formatAdminToken", async (t) => {
  await t.test("empty or undefined input returns 'adm_'", () => {
    assert.equal(formatAdminToken(""), "adm_");
    assert.equal(formatAdminToken(null as any), "adm_");
    assert.equal(formatAdminToken(undefined as any), "adm_");
  });

  await t.test("always keeps 'adm_' prefix", () => {
    assert.equal(formatAdminToken("adm_"), "adm_");
    assert.equal(formatAdminToken("adm"), "adm_");
    assert.equal(formatAdminToken("ADM_"), "adm_");
  });

  await t.test(
    "formats incremental input and limits to 6 chars after prefix",
    () => {
      assert.equal(formatAdminToken("adm_a"), "adm_A");
      assert.equal(formatAdminToken("adm_a7k"), "adm_A7K");
      assert.equal(formatAdminToken("adm_a7k9qf"), "adm_A7K9QF");
      assert.equal(formatAdminToken("adm_a7k9qfextra"), "adm_A7K9QF");
    },
  );

  await t.test("handles input without 'adm_' prefix by adding it", () => {
    assert.equal(formatAdminToken("a7k9qf"), "adm_A7K9QF");
    assert.equal(formatAdminToken("A7K9"), "adm_A7K9");
  });

  await t.test("handles accidental duplicate 'adm_' prefixes", () => {
    assert.equal(formatAdminToken("adm_adm_a7k9qf"), "adm_A7K9QF");
    assert.equal(formatAdminToken("adm_adm_"), "adm_");
  });

  await t.test("extracts token from full admin URLs", () => {
    assert.equal(
      formatAdminToken("https://gabarito.web/admin/adm_A7K9QF"),
      "adm_A7K9QF",
    );
    assert.equal(
      formatAdminToken("https://gabarito.web/admin/a7k9qf"),
      "adm_A7K9QF",
    );
    assert.equal(formatAdminToken("/admin/adm_P9Z2JU"), "adm_P9Z2JU");
  });

  await t.test("strips special characters and spaces from suffix", () => {
    assert.equal(formatAdminToken("adm_a-7 k.9!q f"), "adm_A7K9QF");
  });

  await t.test(
    "handles pasted tokens with ADM in suffix or uppercase prefix",
    () => {
      assert.equal(formatAdminToken("adm_VZT7XG"), "adm_VZT7XG");
      assert.equal(formatAdminToken("ADM_VZT7XG"), "adm_VZT7XG");
      assert.equal(formatAdminToken("VZT7XG"), "adm_VZT7XG");
      assert.equal(formatAdminToken("adm_adm_VZT7XG"), "adm_VZT7XG");
      assert.equal(formatAdminToken("adm_1ADMX2"), "adm_1ADMX2");
      assert.equal(formatAdminToken("adm_ADMF42"), "adm_ADMF42");
      assert.equal(formatAdminToken("ADMF42"), "adm_ADMF42");
    },
  );
});

test("codeFormatters - validateAdminToken", async (t) => {
  await t.test("validates 6-character alphanumeric admin tokens", () => {
    assert.equal(validateAdminToken("adm_A7K9QF"), true);
    assert.equal(validateAdminToken("adm_a7k9qf"), true);
    assert.equal(validateAdminToken("ADM_A7K9QF"), true);
    assert.equal(validateAdminToken("adm_000000"), true);
    assert.equal(validateAdminToken("adm_ZZZZZZ"), true);
  });

  await t.test("rejects invalid admin tokens", () => {
    assert.equal(validateAdminToken(""), false);
    assert.equal(validateAdminToken("adm_"), false);
    assert.equal(validateAdminToken("adm_A7K9Q"), false); // 5 chars
    assert.equal(validateAdminToken("adm_A7K9QFA"), false); // 7 chars
    assert.equal(validateAdminToken("A7K9QF"), false); // missing adm_
    assert.equal(validateAdminToken("adm-A7K9QF"), false); // wrong separator
    assert.equal(validateAdminToken("adm_A7K-QF"), false); // invalid character
    assert.equal(validateAdminToken("adm_A7K QF"), false); // space
  });
});
