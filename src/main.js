import { COUNTRIES, normalizePhone, validateForm } from "./validation.js";

const API_URL = "https://script.google.com/macros/s/AKfycbw_Emn4j9U2d_DJHxqp7TT1vMHXdQDFEVBoRNAAdW4OWrTEIVL3OedkwV-DauFb23tFQQ/exec";
const form = document.querySelector("#registrationForm");
const submitButton = form.querySelector('button[type="submit"]');
const status = document.querySelector("#formMessage");
const touched = new WeakSet();
let submitting = false;

const FAQS = [
  { question: "When is the summit?", answer: "The current application lists November 12 and 14, 2026." },
  { question: "Where will the summit take place?", answer: "The current application lists The British University in Egypt." },
  { question: "Who may attend the Day 2 workshop?", answer: "The workshop is intended for senior undergraduate students, Master's students, PhD students, and early-career PhD holders (PhD awarded in 2024 or later). Eligibility is reviewed by organizers." },
  { question: "Does submitting an application guarantee acceptance?", answer: "No. Applications are reviewed by the organizing team, which sends the final decision by email." }
];

const PARTNERS = [];
const FEATURED_PARTNER = "";

function renderFaqs() {
  const container = document.querySelector("#faqList");
  for (const item of FAQS) {
    const details = document.createElement("details");
    details.className = "faq-item";
    const summary = document.createElement("summary");
    summary.textContent = item.question;
    const answer = document.createElement("p");
    answer.textContent = item.answer;
    details.append(summary, answer);
    container.append(details);
  }
}

function renderPartners() {
  const container = document.querySelector("#partnerGrid");
  if (!PARTNERS.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "partner-placeholder";
    placeholder.textContent = "Approved partner and sponsor logos will be published here.";
    container.append(placeholder);
    return;
  }

  for (const partner of PARTNERS) {
    const item = document.createElement("div");
    item.className = `partner-logo${partner.name === FEATURED_PARTNER ? " featured" : ""}`;
    const image = document.createElement("img");
    image.src = partner.logo;
    image.alt = partner.logoAlt || partner.name;
    image.loading = "lazy";
    item.append(image);
    container.append(item);
  }
}

function populateCountries(select) {
  for (const item of COUNTRIES) {
    const option = document.createElement("option");
    option.value = item.country;
    option.textContent = `${item.name} (+${item.callingCode})`;
    if (item.country === "EG") option.selected = true;
    select.append(option);
  }
}

populateCountries(document.querySelector("#mobileCountry"));
populateCountries(document.querySelector("#walletCountry"));
renderFaqs();
renderPartners();

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#primaryNavigation");
menuButton.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!expanded));
  menuButton.setAttribute("aria-label", expanded ? "Open navigation menu" : "Close navigation menu");
  navigation.classList.toggle("open", !expanded);
});
navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation menu");
    navigation.classList.remove("open");
  }
});

function isVisible(field) {
  return !field.closest(".hidden") && !field.closest("[hidden]");
}

function errorNode(field) {
  const fieldContainer = field.closest(".field") || field.closest(".choice") || field.parentElement;
  let error = fieldContainer.querySelector(`:scope > .field-error[data-for="${CSS.escape(field.id || field.name)}"]`);
  if (!error) {
    error = document.createElement("p");
    error.className = "field-error";
    error.dataset.for = field.id || field.name;
    error.id = `error-${field.id || field.name}`;
    error.setAttribute("role", "alert");
    fieldContainer.append(error);
  }
  return error;
}

function describeError(field, message) {
  if (!field.id && field.name) {
    field.id = `field-${field.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }
  const error = errorNode(field);
  error.textContent = message;
  error.hidden = !message;
  field.setAttribute("aria-invalid", String(Boolean(message)));
  if (message) {
    const existing = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    field.setAttribute("aria-describedby", [...new Set([...existing, error.id])].join(" "));
  }
}

function validationOptions() {
  return {
    countryFor: (field) => document.querySelector(field.id === "walletNumber" ? "#walletCountry" : "#mobileCountry").value,
    paymentMethod: () => form.querySelector('input[name="paymentMethod"]:checked')?.value
  };
}

function updateErrors(fields) {
  for (const { field, message } of fields) {
    if (field?.name !== "attendance") describeError(field, message);
  }
  const attendanceError = document.querySelector("#attendanceError");
  const attendanceInvalid = fields.some(({ field }) => field?.name === "attendance");
  attendanceError.hidden = !attendanceInvalid;
  return fields;
}

function currentError(field) {
  return validateForm(form, validationOptions()).find((error) => error.field === field || (field.name && error.field.name === field.name))?.message || "";
}

form.addEventListener("focusout", (event) => {
  const field = event.target;
  if (!(field instanceof HTMLElement) || !field.matches("input, select, textarea") || !isVisible(field)) return;
  touched.add(field);
  describeError(field, currentError(field));
});

form.addEventListener("input", (event) => {
  const field = event.target;
  if (touched.has(field)) describeError(field, currentError(field));
});

form.addEventListener("change", () => {
  queueMicrotask(() => {
    for (const field of form.querySelectorAll("input, select, textarea")) {
      if (!isVisible(field)) {
        if (field.type === "file") field.value = "";
        else if (field.type === "checkbox" || field.type === "radio") field.checked = false;
        else field.value = "";
        field.removeAttribute("aria-invalid");
        const error = errorNode(field);
        error.textContent = "";
        error.hidden = true;
      } else if (touched.has(field)) {
        describeError(field, currentError(field));
      }
    }
  });
});

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read an uploaded file."));
    reader.readAsDataURL(file);
  });
}

async function prepareFile(id) {
  const file = document.querySelector(`#${id}`).files[0];
  if (!file) return null;
  return { name: file.name, mimeType: file.type, base64: await readFileAsBase64(file) };
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.remove("hidden", "error");
  if (isError) status.classList.add("error");
  status.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetConditionalPanels() {
  for (const id of [
    "ieeeNumberField", "nationalIdFields", "studentFields", "graduateFields", "pickupField",
    "refundInstaPay", "refundWallet", "mastersCurrent", "mastersCompleted", "phdCurrent", "phdCompleted"
  ]) {
    document.querySelector(`#${id}`).classList.add("hidden");
  }
  document.querySelectorAll(".other-input").forEach((field) => field.classList.add("hidden"));
  document.querySelectorAll(".hidden input, .hidden select, .hidden textarea").forEach((field) => {
    field.required = false;
  });
}

async function buildPayload() {
  const data = {};
  for (const [key, value] of new FormData(form).entries()) {
    if (value instanceof File) continue;
    if (key === "attendance") {
      if (!data.attendance) data.attendance = [];
      data.attendance.push(value);
    } else {
      data[key] = typeof value === "string" ? value.trim() : value;
    }
  }

  data.mobile = normalizePhone(data.mobile, document.querySelector("#mobileCountry").value);
  if (data.walletNumber) {
    data.walletNumber = normalizePhone(data.walletNumber, document.querySelector("#walletCountry").value);
  }
  data.totalFee = document.querySelector("#totalFee").textContent.replace(" EGP", "");
  data.files = {};
  const paymentProof = await prepareFile("paymentProof");
  if (paymentProof) data.files.paymentProof = paymentProof;
  const nationalIdFile = await prepareFile("nationalIdFile");
  if (nationalIdFile) data.files.nationalIdFile = nationalIdFile;
  return data;
}

async function submitRegistration(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (submitting) return;

  const errors = updateErrors(validateForm(form, validationOptions()));
  if (errors.length) {
    errors[0].field?.focus();
    errors[0].field?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  submitting = true;
  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";
  status.classList.remove("hidden", "error");
  status.textContent = "Submitting your application. Please wait.";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(await buildPayload()),
      signal: AbortSignal.timeout(25000)
    });
    if (!response.ok) throw new Error("The registration service returned an HTTP error.");

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("The registration service returned an unreadable response.");
    }
    if (!result || result.success !== true) {
      throw new Error(typeof result?.message === "string" ? result.message : "Registration was not confirmed.");
    }

    const registrationId = typeof result.registrationId === "string" && result.registrationId.trim()
      ? ` Registration ID: ${result.registrationId.trim()}.`
      : "";
    showStatus(`Your application was submitted successfully.${registrationId} Your application is pending review.`);
    form.reset();
    resetConditionalPanels();
    document.querySelector("#mobileCountry").value = "EG";
    document.querySelector("#walletCountry").value = "EG";
    document.querySelectorAll(".field-error[data-for]").forEach((error) => {
      error.textContent = "";
      error.hidden = true;
    });
    document.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute("aria-invalid"));
    document.querySelectorAll(".hidden").forEach((container) => {
      for (const field of container.querySelectorAll("input, select, textarea")) {
        field.required = false;
      }
    });
    document.querySelector("#attendanceError").hidden = true;
    document.querySelector("#transportFee").textContent = "0 EGP";
    document.querySelector("#totalFee").textContent = "200 EGP";
  } catch (error) {
    const message = error.name === "TimeoutError"
      ? "The request timed out, so we could not confirm your submission. Please check with the organizing team before trying again. Your entered information is still here."
      : "We could not confirm your submission. Please check with the organizing team before trying again. Your entered information is still here.";
    showStatus(message, true);
  } finally {
    submitting = false;
    submitButton.disabled = false;
    submitButton.textContent = "Submit Registration Application";
  }
}

form.addEventListener("submit", submitRegistration, true);