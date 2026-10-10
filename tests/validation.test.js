import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePhone,
  VALIDATION_RULES,
  validateEmail,
  validateEgyptianNationalId,
  validateFile,
  validateName,
  validatePaymentReference,
  validatePhone
} from "../src/validation.js";

test("name validation accepts Arabic, English, diacritics, and common punctuation", () => {
  for (const name of ["Amr Nabih", "مريم أحمد", "José O’Connor-Smith"]) {
    assert.equal(validateName(name), "");
  }
  assert.notEqual(validateName("   "), "");
  assert.notEqual(validateName("A"), "");
});

test("email validation accepts ordinary valid forms and rejects malformed addresses", () => {
  assert.equal(validateEmail(" person@example.com "), "");
  for (const email of ["@example.com", "person@", "person@example", "person..name@example.com"]) {
    assert.notEqual(validateEmail(email), "", email);
  }
});

test("phone validation follows Egyptian and international numbering plans", () => {
  assert.equal(validatePhone("01012345678", "EG"), "");
  assert.equal(normalizePhone("01012345678", "EG"), "+201012345678");
  assert.equal(validatePhone("00201012345678", "EG"), "");
  assert.equal(normalizePhone("00201012345678", "EG"), "+201012345678");
  assert.equal(validatePhone("+447911123456", "EG"), "");
  assert.equal(normalizePhone("+447911123456", "EG"), "+447911123456");
  for (const phone of ["123", "01012", "010123456789999", "not a phone"]) {
    assert.notEqual(validatePhone(phone, "EG"), "", phone);
  }
  assert.notEqual(validatePhone("020 1234 5678", "EG"), "");
});

test("Egyptian national ID checks length, century, calendar date, and governorate structure", () => {
  assert.equal(validateEgyptianNationalId("29901011234567"), "");
  for (const id of ["2990101123456", "299010112345678", "2990A011234567", "29902311234567", "29901019934567", "49901011234567"]) {
    assert.notEqual(validateEgyptianNationalId(id), "", id);
  }
});

test("payment reference length rules are configurable and isolated per method", () => {
  VALIDATION_RULES.paymentReferenceDigits.InstaPay = 12;
  assert.notEqual(validatePaymentReference("12345678901", "InstaPay"), "");
  assert.equal(validatePaymentReference("123456789012", "InstaPay"), "");
  assert.notEqual(validatePaymentReference("1234567890123", "InstaPay"), "");
  assert.notEqual(validatePaymentReference("12345678901a", "InstaPay"), "");
  assert.equal(validatePaymentReference("wallet-ref", "Mobile Wallet"), "");
  VALIDATION_RULES.paymentReferenceDigits.InstaPay = null;
});

test("wallet and refund phone values use the same international phone validation", () => {
  assert.equal(validatePhone("01012345678", "EG"), "");
  assert.equal(validatePhone("+14155552671", "EG"), "");
  assert.notEqual(validatePhone("wallet-number", "EG"), "");
});

test("uploads require a matching supported MIME type and extension within the size limit", () => {
  assert.equal(validateFile({ name: "receipt.pdf", type: "application/pdf", size: 1024 }), "");
  assert.equal(validateFile({ name: "receipt.jpg", type: "image/jpeg", size: 1024 }), "");
  assert.notEqual(validateFile({ name: "receipt.pdf", type: "image/png", size: 1024 }), "");
  assert.notEqual(validateFile({ name: "receipt.exe", type: "", size: 1024 }), "");
  assert.notEqual(validateFile({ name: "large.pdf", type: "application/pdf", size: 5 * 1024 * 1024 + 1 }), "");
});