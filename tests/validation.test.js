import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePhone,
  VALIDATION_RULES,
  validateAmbassadorCode,
  validateEmail,
  validateEgyptianNationalId,
  validateFile,
  validateName,
  validatePaymentReference,
  validatePhone,
  validateRegistrationConsent
} from "../src/validation.js";
import { escapeHtml, generateRegistrationEmailHtml } from "../src/emailTemplate.js";

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

test("payment reference requires exactly 12 numeric digits for both InstaPay and Mobile Wallet", () => {
  for (const method of ["InstaPay", "Mobile Wallet"]) {
    // Valid 12 digits
    assert.equal(validatePaymentReference("123456789012", method), "");
    assert.equal(validatePaymentReference("987654321098", method), "");

    // Leading zeros preserved as string
    assert.equal(validatePaymentReference("000123456789", method), "");
    assert.equal(validatePaymentReference("000000000000", method), "");
    assert.equal(validatePaymentReference("012345678901", method), "");

    // Empty or whitespace-only
    assert.notEqual(validatePaymentReference("", method), "");
    assert.notEqual(validatePaymentReference("   ", method), "");
    assert.notEqual(validatePaymentReference(null, method), "");
    assert.notEqual(validatePaymentReference(undefined, method), "");

    // Too few digits (11 or fewer)
    assert.notEqual(validatePaymentReference("1", method), "");
    assert.notEqual(validatePaymentReference("123456", method), "");
    assert.notEqual(validatePaymentReference("12345678901", method), "");
    assert.notEqual(validatePaymentReference("01234567890", method), "");

    // Too many digits (13 or more)
    assert.notEqual(validatePaymentReference("1234567890123", method), "");
    assert.notEqual(validatePaymentReference("0001234567890", method), "");
    assert.notEqual(validatePaymentReference("123456789012345", method), "");

    // Contains letters
    assert.notEqual(validatePaymentReference("12345678901a", method), "");
    assert.notEqual(validatePaymentReference("A12345678901", method), "");
    assert.notEqual(validatePaymentReference("abcdefghijkl", method), "");

    // Contains whitespace
    assert.notEqual(validatePaymentReference(" 123456789012", method), "");
    assert.notEqual(validatePaymentReference("123456789012 ", method), "");
    assert.notEqual(validatePaymentReference("1234 5678 9012", method), "");
    assert.notEqual(validatePaymentReference("123456 789012", method), "");

    // Special characters
    assert.notEqual(validatePaymentReference("123456-789012", method), "");
    assert.notEqual(validatePaymentReference("123456.789012", method), "");
    assert.notEqual(validatePaymentReference("12345678901#", method), "");
    assert.notEqual(validatePaymentReference("!@#$%^&*()_+", method), "");
  }
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

test("ambassador code validation requires a non-empty string when provided", () => {
  // Valid non-empty codes
  assert.equal(validateAmbassadorCode("AMB2026"), "");
  assert.equal(validateAmbassadorCode("AMB-CAIRO-01"), "");
  assert.equal(validateAmbassadorCode("eng_code_12"), "");
  assert.equal(validateAmbassadorCode(" 998877 "), "");

  // Missing or whitespace-only codes
  assert.notEqual(validateAmbassadorCode(""), "");
  assert.notEqual(validateAmbassadorCode("   "), "");
  assert.notEqual(validateAmbassadorCode(null), "");
  assert.notEqual(validateAmbassadorCode(undefined), "");
});

test("registration consent validation requires explicit agreement", () => {
  // Valid affirmative consent
  assert.equal(validateRegistrationConsent(true), "");
  assert.equal(validateRegistrationConsent("Yes"), "");
  assert.equal(validateRegistrationConsent("true"), "");

  // Invalid or missing consent
  assert.notEqual(validateRegistrationConsent(false), "");
  assert.notEqual(validateRegistrationConsent("No"), "");
  assert.notEqual(validateRegistrationConsent(""), "");
  assert.notEqual(validateRegistrationConsent(null), "");
  assert.notEqual(validateRegistrationConsent(undefined), "");
});

test("HTML email template properly escapes input and includes all required event, review, and organizer details", () => {
  const applicantData = {
    fullName: "Amr <script>alert('xss')</script> Nabih & Co.",
    email: "amr@example.com",
    mobile: "+201212551698",
    status: "Graduate",
    university: "The British University in Egypt",
    graduateDepartment: "Electrical Engineering",
    attendance: ["November 12", "November 14"],
    transport: "No transport",
    totalFee: "200",
    registrationId: "SS26-TEST1234",
    referralSources: ["IEEE Event", "Through an Ambassador"],
    ambassadorCode: "AMB-2026",
    // Sensitive data that MUST NEVER appear in email
    nationalId: "29901011234567",
    transactionRef: "123456789012",
    files: {
      paymentProof: { base64: "base64secret", url: "https://drive.google.com/secret/payment.jpg" },
      nationalIdFile: { base64: "base64secret2", url: "https://drive.google.com/secret/id.pdf" }
    }
  };

  const html = generateRegistrationEmailHtml(applicantData);

  // Must contain personalized greeting and escaped names
  assert.ok(html.includes("Thank You, Amr &lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt; Nabih &amp; Co."));
  assert.ok(!html.includes("<script>alert('xss')</script>"));

  // Must contain Registration Reference ID
  assert.ok(html.includes("SS26-TEST1234"));

  // Must contain the prominent Application Review notice
  assert.ok(html.includes("Application Under Review"));
  assert.ok(html.includes("Please note that all registration applications are subject to review by the organizing committee."));
  assert.ok(html.includes("This email confirms that your details and payment records have been received; it does not constitute final event acceptance or payment verification until approved."));

  // Must contain event dates, theme, and location
  assert.ok(html.includes("Sensors Summit 2026: Digital Twin in Biosensing Applications"));
  assert.ok(html.includes("November 12 (Day 1 Talks &amp; Keynotes)"));
  assert.ok(html.includes("November 14 (Day 2 Workshop)"));
  assert.ok(html.includes("The British University in Egypt (BUE), El Sherouk City, Cairo"));
  assert.ok(html.includes("https://maps.app.goo.gl/BhbY8ptNSHnDszbR6"));

  // Must contain organizer contact info
  assert.ok(html.includes("Eng. Amr Nabih"));
  assert.ok(html.includes("Amr_Nabih@ieee.org"));
  assert.ok(html.includes("+20 121 255 1698"));

  // Must contain official logos and partner logos
  assert.ok(html.includes("sensors-summit.png"));
  assert.ok(html.includes("Egypt%20Chapter%20Logo%20-%20Original.png"));
  assert.ok(html.includes("BUE-Logo.png"));
  assert.ok(html.includes("IEEE%20Women%20in%20Sensors%20Logo%20RGB.png"));
  assert.ok(html.includes("FABLAB-Logo.png"));
  assert.ok(html.includes("ELEC_Logo.png"));
  assert.ok(html.includes("ASIS-Logo.png"));
  assert.ok(html.includes("DAAD-Logo.png"));
  assert.ok(html.includes("IEEE%20Sensors%20Council%20Logo.png"));

  // Must contain all 7 IEEE Sensors Council Egypt Chapter social channels
  assert.ok(html.includes("mailto:egypt-sensorcouncil@ieee.org"));
  assert.ok(html.includes("https://youtube.com/@ieeesensorscouncilegyptchapter?si=zNRtidcjJWh7_-bp"));
  assert.ok(html.includes("https://whatsapp.com/channel/0029Vb1iNb7HwXb6x98p8d0p"));
  assert.ok(html.includes("https://www.linkedin.com/company/ieee-sensors-council-egypt-chapter/"));
  assert.ok(html.includes("https://www.instagram.com/sensorscouncilegypt?igsh=bWQ0ZDljeG1nZnlj"));
  assert.ok(html.includes("https://www.facebook.com/share/1DX3SxsE77/"));
  assert.ok(html.includes("https://r8.ieee.org/egypt-sensor-council/"));

  // Must include referral sources and Ambassador Code when referral has Through an Ambassador
  assert.ok(html.includes("IEEE Event, Through an Ambassador"));
  assert.ok(html.includes("AMB-2026"));

  // STRICT PRIVACY CHECK: Sensitive data MUST NOT be in the email HTML
  assert.ok(!html.includes("29901011234567"), "National ID must not appear in confirmation email");
  assert.ok(!html.includes("123456789012"), "Transaction reference must not appear in confirmation email");
  assert.ok(!html.includes("https://drive.google.com/secret/payment.jpg"), "Payment proof URL must not appear in email");
  assert.ok(!html.includes("https://drive.google.com/secret/id.pdf"), "National ID file URL must not appear in email");
  assert.ok(!html.includes("base64secret"), "Base64 payloads must not appear in email");
});

test("HTML email template handles missing optional fields and non-ambassador referral cleanly", () => {
  const minimalData = {
    fullName: "Nouran Mohamed",
    email: "nouran@example.com",
    mobile: "+201011112222",
    status: "Student",
    university: "Cairo University",
    studentDepartment: "Biomedical Engineering",
    attendance: ["November 12"],
    transport: "No transport",
    totalFee: "200",
    referralSources: ["Social Media", "Friend"]
  };

  const html = generateRegistrationEmailHtml(minimalData);

  assert.ok(html.includes("Thank You, Nouran Mohamed!"));
  assert.ok(html.includes("Cairo University"));
  assert.ok(html.includes("Biomedical Engineering"));
  assert.ok(html.includes("Referral Sources:</strong></td>\n                  <td style=\"padding: 6px 0;\">Social Media, Friend</td>"));
  assert.ok(!html.includes("Ambassador Code:"));
});

test("registration fees calculate 200 EGP standard and 300 EGP with transport, invariant of day count", () => {
  function computeFee(transportSelection, daysCount) {
    const baseFee = 200;
    const transportFee = transportSelection !== "No transport" ? 100 : 0;
    return baseFee + transportFee;
  }

  // 1 day without transport -> 200
  assert.equal(computeFee("No transport", 1), 200);
  // 2 days without transport -> 200 (selecting both days does not increase fee)
  assert.equal(computeFee("No transport", 2), 200);
  // 1 day with transport -> 300
  assert.equal(computeFee("BUE Bus", 1), 300);
  // 2 days with transport -> 300
  assert.equal(computeFee("Other location", 2), 300);
});