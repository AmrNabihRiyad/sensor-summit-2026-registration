import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from "libphonenumber-js";
import isEmail from "validator/lib/isEmail.js";

export const VALIDATION_RULES = Object.freeze({
  fullName: { minLength: 2, maxLength: 120 },
  email: { maxLength: 254 },
  organization: { minLength: 2, maxLength: 160 },
  file: { maxBytes: 5 * 1024 * 1024, mimeTypes: ["application/pdf", "image/jpeg", "image/png"] },
  paymentReferenceDigits: { InstaPay: 12, "Mobile Wallet": 12 }
});

export const COUNTRIES = getCountries()
  .map((country) => ({
    country,
    name: new Intl.DisplayNames(["en"], { type: "region" }).of(country) || country,
    callingCode: getCountryCallingCode(country)
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

const EGYPTIAN_GOVERNORATE_CODES = new Set([
  "01", "02", "03", "04", "11", "12", "13", "14", "15", "16", "17", "18",
  "19", "21", "22", "23", "24", "25", "26", "27", "28", "29", "31", "32",
  "33", "34", "35", "88"
]);

const VALID_NAME = /^[\p{L}\p{M}]+(?:[ .’'\-][\p{L}\p{M}]+)*$/u;

export function validateName(value) {
  const name = value.trim();
  if (name.length < VALIDATION_RULES.fullName.minLength || !VALID_NAME.test(name)) {
    return "Enter a valid full name using letters, spaces, or common name punctuation.";
  }
  if (name.length > VALIDATION_RULES.fullName.maxLength) return "Name must be 120 characters or fewer.";
  return "";
}

export function validateEmail(value) {
  const email = value.trim();
  return email.length <= VALIDATION_RULES.email.maxLength && isEmail(email, {
    allow_utf8_local_part: true,
    require_tld: true,
    allow_ip_domain: false
  }) ? "" : "Please enter a valid email address.";
}

export function parseValidPhone(value, selectedCountry = "EG") {
  const phone = value.trim();
  if (!phone) return null;

  try {
    const parsed = phone.startsWith("+")
      ? parsePhoneNumberFromString(phone)
      : parsePhoneNumberFromString(phone, selectedCountry);
    return parsed?.isValid() ? parsed : null;
  } catch {
    return null;
  }
}

export function validatePhone(value, selectedCountry = "EG") {
  return parseValidPhone(value, selectedCountry)
    ? ""
    : "Please enter a valid phone number for the selected country.";
}

export function normalizePhone(value, selectedCountry = "EG") {
  return parseValidPhone(value, selectedCountry)?.number || "";
}

export function validateEgyptianNationalId(value) {
  if (!/^\d{14}$/.test(value)) {
    return "The national ID must contain exactly 14 digits and have a valid structure.";
  }

  const centuryCode = value[0];
  if (centuryCode !== "2" && centuryCode !== "3") {
    return "The national ID must contain exactly 14 digits and have a valid structure.";
  }

  const year = Number(`${centuryCode === "2" ? "19" : "20"}${value.slice(1, 3)}`);
  const month = Number(value.slice(3, 5));
  const day = Number(value.slice(5, 7));
  const date = new Date(Date.UTC(year, month - 1, day));
  const validDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  const governorate = value.slice(7, 9);

  return validDate && EGYPTIAN_GOVERNORATE_CODES.has(governorate)
    ? ""
    : "The national ID must contain exactly 14 digits and have a valid structure.";
}

export function validatePaymentReference(value, paymentMethod = "Payment") {
  const digits = VALIDATION_RULES.paymentReferenceDigits[paymentMethod] ?? 12;
  const str = typeof value === "string" ? value : String(value ?? "");

  if (!str.trim()) {
    return "The transaction reference must contain exactly 12 digits.";
  }

  if (digits === null || digits === undefined) {
    return "";
  }

  const pattern = new RegExp(`^[0-9]{${digits}}$`);
  return pattern.test(str)
    ? ""
    : "The transaction reference must contain exactly 12 digits.";
}

export function validateAmbassadorCode(value) {
  const code = typeof value === "string" ? value.trim() : "";
  if (!code) {
    return "Please enter your Ambassador Code.";
  }
  return "";
}

export function validateRegistrationConsent(value) {
  if (value === true || value === "Yes" || value === "true") {
    return "";
  }
  return "Consent to the processing of personal data is required.";
}

export function validateFile(file) {
  if (!file) return "Select a file to upload.";
  const extensionMatchesMime = {
    "application/pdf": /\.pdf$/i,
    "image/jpeg": /\.jpe?g$/i,
    "image/png": /\.png$/i
  };
  const extension = extensionMatchesMime[file.type];
  if (!VALIDATION_RULES.file.mimeTypes.includes(file.type) || !extension?.test(file.name)) {
    return "Upload a PDF, JPG, or PNG file.";
  }
  if (file.size > VALIDATION_RULES.file.maxBytes) return "Each file must be 5 MB or smaller.";
  return "";
}

function isVisible(field) {
  return !field.closest(".hidden") && !field.closest("[hidden]");
}

function errorForField(field, form, options) {
  const value = field.value;
  const name = field.name;

  if (field.type === "radio") {
    return form.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]:checked`)
      ? ""
      : "Choose an option to continue.";
  }
  if (field.type === "checkbox") {
    if (field.id === "registrationConsent") {
      return validateRegistrationConsent(field.checked);
    }
    if (field.name === "referralSources") {
      return "";
    }
    return field.checked ? "" : "This confirmation is required.";
  }
  if (field.type === "file") return field.required ? validateFile(field.files[0]) : "";
  if (field.id === "transactionRef") return validatePaymentReference(value, options.paymentMethod());
  if (field.id === "ambassadorCode") return validateAmbassadorCode(value);
  if (!value.trim()) return field.required ? "This field is required." : "";

  if (field.id === "fullName" || field.id === "recipientName") return validateName(value);
  if (field.id === "email") return validateEmail(value);
  if (field.id === "mobile" || field.id === "walletNumber") return validatePhone(value, options.countryFor(field));
  if (field.id === "nationalId") return validateEgyptianNationalId(value);
  if (["universityOther", "studentDepartmentOther", "graduateDepartmentOther", "jobTitle", "organization", "pickupLocation", "ieeeNumber"].includes(field.id)) {
    const normalized = value.trim();
    if (normalized.length < 2) return "Enter at least 2 characters.";
    if (normalized.length > VALIDATION_RULES.organization.maxLength) return "Use 160 characters or fewer.";
  }
  if (!field.checkValidity()) return field.validationMessage || "Enter a valid value.";
  return "";
}

export function validateForm(form, options) {
  const errors = [];
  const checkedGroups = new Set();

  for (const field of form.elements) {
    if (!field.required || !isVisible(field)) continue;
    if (field.type === "radio") {
      if (checkedGroups.has(field.name)) continue;
      checkedGroups.add(field.name);
    }
    const message = errorForField(field, form, options);
    if (message) errors.push({ field, message });
  }

  if (!form.querySelector('input[name="attendance"]:checked')) {
    errors.push({ field: form.querySelector("#day1"), message: "Please select at least one attendance day." });
  }

  return errors;
}