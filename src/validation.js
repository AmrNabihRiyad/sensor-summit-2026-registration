import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from "libphonenumber-js";
import isEmail from "validator/lib/isEmail.js";

export const VALIDATION_RULES = Object.freeze({
  fullName: { minLength: 2, maxLength: 120 },
  email: { maxLength: 254 },
  organization: { minLength: 2, maxLength: 160 },
  file: { maxBytes: 5 * 1024 * 1024, mimeTypes: ["application/pdf", "image/jpeg", "image/png"] },
  paymentReferenceDigits: { InstaPay: 12, "Mobile Wallet": 12 }
});

export const PHD_CUTOFF_DATE = "2024-01-01";

export const GUEST_ACADEMIC_QUALIFICATIONS = Object.freeze({
  MASTERS_PURSUING: "Currently pursuing a Master's degree.",
  PHD_PURSUING: "Currently pursuing a PhD.",
  PHD_ON_OR_AFTER_2024: "I hold a PhD obtained on or after January 1, 2024.",
  PHD_BEFORE_2024: "I hold a PhD obtained before January 1, 2024.",
  NONE_OF_ABOVE: "None of the above."
});

export function normalizeQualification(q) {
  if (!q) return "";
  const s = String(q).trim();
  const lower = s.toLowerCase().replace(/\.$/, "");
  if (lower.includes("master") && lower.includes("pursuing")) {
    return GUEST_ACADEMIC_QUALIFICATIONS.MASTERS_PURSUING;
  }
  if (lower.includes("phd") && lower.includes("pursuing")) {
    return GUEST_ACADEMIC_QUALIFICATIONS.PHD_PURSUING;
  }
  if (lower.includes("phd") && (lower.includes("on or after") || lower.includes("after"))) {
    return GUEST_ACADEMIC_QUALIFICATIONS.PHD_ON_OR_AFTER_2024;
  }
  if (lower.includes("phd") && lower.includes("before")) {
    return GUEST_ACADEMIC_QUALIFICATIONS.PHD_BEFORE_2024;
  }
  if (lower.includes("none")) {
    return GUEST_ACADEMIC_QUALIFICATIONS.NONE_OF_ABOVE;
  }
  return s;
}

export function parsePhdDate(dateInput) {
  if (!dateInput) return null;
  const str = String(dateInput).trim();
  if (!str) return null;

  if (/^\d{4}$/.test(str)) {
    const y = parseInt(str, 10);
    return { year: y, isYearOnly: true, isoDate: `${y}-01-01` };
  }

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    return { year: y, month: m, day: d, isYearOnly: false, isoDate: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}` };
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return { year: y, month: parseInt(m, 10), day: parseInt(d, 10), isYearOnly: false, isoDate: `${y}-${m}-${d}` };
  }

  return null;
}

export function isPhdAwardDateOnOrAfterCutoff(dateInput) {
  const parsed = parsePhdDate(dateInput);
  if (!parsed) return false;
  if (parsed.isYearOnly) {
    return parsed.year >= 2024;
  }
  return parsed.isoDate >= PHD_CUTOFF_DATE;
}

export function isDay2EligibleQualification(qualification, awardDateOrYear) {
  const norm = normalizeQualification(qualification);
  if (norm === GUEST_ACADEMIC_QUALIFICATIONS.MASTERS_PURSUING) {
    return true;
  }
  if (norm === GUEST_ACADEMIC_QUALIFICATIONS.PHD_PURSUING) {
    return true;
  }
  if (norm === GUEST_ACADEMIC_QUALIFICATIONS.PHD_ON_OR_AFTER_2024) {
    if (awardDateOrYear === undefined || awardDateOrYear === null || awardDateOrYear === "") {
      return false;
    }
    return isPhdAwardDateOnOrAfterCutoff(awardDateOrYear);
  }
  return false;
}

export function validateGuestAcademicQualification(value) {
  const norm = normalizeQualification(value);
  const allowed = Object.values(GUEST_ACADEMIC_QUALIFICATIONS);
  if (!norm || !allowed.includes(norm)) {
    return "Please select your academic qualification.";
  }
  return "";
}

export function validatePhdAwardDate(dateInput, qualification) {
  const norm = normalizeQualification(qualification);
  const requiresDate = norm === GUEST_ACADEMIC_QUALIFICATIONS.PHD_ON_OR_AFTER_2024 ||
                       norm === GUEST_ACADEMIC_QUALIFICATIONS.PHD_BEFORE_2024;
  if (!requiresDate) return "";

  const str = String(dateInput || "").trim();
  if (!str) {
    return "Please enter your PhD award date.";
  }

  const parsed = parsePhdDate(str);
  if (!parsed) {
    return "Please enter a valid PhD award date or year.";
  }

  const isRecent = isPhdAwardDateOnOrAfterCutoff(str);

  if (norm === GUEST_ACADEMIC_QUALIFICATIONS.PHD_ON_OR_AFTER_2024) {
    if (!isRecent) {
      return "PhD award date must be on or after January 1, 2024 for the selected qualification.";
    }
  } else if (norm === GUEST_ACADEMIC_QUALIFICATIONS.PHD_BEFORE_2024) {
    if (isRecent) {
      return "PhD award date must be earlier than January 1, 2024 for the selected qualification.";
    }
  }

  return "";
}

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
  if (field.id === "guestAcademicQualification" || field.name === "guestAcademicQualification") {
    return validateGuestAcademicQualification(value);
  }
  if (field.id === "guestPhdDate" || field.name === "guestPhdDate") {
    const qual = form.querySelector('#guestAcademicQualification, input[name="guestAcademicQualification"]:checked')?.value || "";
    return validatePhdAwardDate(value, qual);
  }
  if (["universityOther", "studentDepartmentOther", "graduateDepartmentOther", "jobTitle", "organization", "pickupLocation", "ieeeNumber", "guestOrganization", "guestTitleOther", "guestOrganizationTypeOther"].includes(field.id)) {
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

  const selectedCategory = form.querySelector('input[name="status"]:checked')?.value;
  if (selectedCategory === "Distinguished Guest / Professional") {
    const qualEl = form.querySelector('#guestAcademicQualification, input[name="guestAcademicQualification"]:checked');
    const qual = qualEl ? qualEl.value : "";
    const qualFieldContainer = form.querySelector("#guestAcademicQualificationField") || form.querySelector("#guestAcademicQualification");
    if (qualFieldContainer && isVisible(qualFieldContainer)) {
      const qualError = validateGuestAcademicQualification(qual);
      const targetField = form.querySelector("#guestAcademicQualification") || form.querySelector('input[name="guestAcademicQualification"]') || qualEl;
      if (qualError && targetField && !errors.some(e => e.field === targetField)) {
        errors.push({ field: targetField, message: qualError });
      }
    }

    const normQual = normalizeQualification(qual);
    if (normQual === GUEST_ACADEMIC_QUALIFICATIONS.PHD_ON_OR_AFTER_2024 || normQual === GUEST_ACADEMIC_QUALIFICATIONS.PHD_BEFORE_2024) {
      const phdDateEl = form.querySelector("#guestPhdDate");
      if (phdDateEl && isVisible(phdDateEl)) {
        const dateErr = validatePhdAwardDate(phdDateEl.value, qual);
        if (dateErr && !errors.some(e => e.field === phdDateEl)) {
          errors.push({ field: phdDateEl, message: dateErr });
        }
      }
    }

    const day2 = form.querySelector("#day2");
    if (day2 && day2.checked) {
      const phdDateVal = form.querySelector("#guestPhdDate")?.value || "";
      if (!isDay2EligibleQualification(qual, phdDateVal)) {
        errors.push({ field: day2, message: "Day 2 attendance is restricted to eligible academic qualifications." });
      }
    }
  }

  if (!form.querySelector('input[name="attendance"]:checked')) {
    errors.push({ field: form.querySelector("#day1"), message: "Please select at least one attendance day." });
  }

  return errors;
}