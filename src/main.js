import { COUNTRIES, normalizePhone, validateForm } from "./validation.js";
import { API_CONFIG } from "./config.js";
import { initNav } from "./components/nav.js";
import { initPaymentInstructions } from "./components/paymentInstructions.js";
import bueLogo from "./assets/logos/BUE-Logo.png";
import womenInSensorsLogo from "./assets/logos/IEEE Women in Sensors Logo RGB.png";
import daadLogo from "./assets/logos/DAAD-Logo.png";
import asisLogo from "./assets/logos/ASIS-Logo.png";
import elecLogo from "./assets/logos/ELEC_Logo.png";
import fablabLogo from "./assets/logos/FABLAB-Logo.png";
import egyptChapterLogo from "./assets/logos/Egypt Chapter Logo - Original.png";
import ieeeSensorsCouncilLogo from "./assets/logos/IEEE Sensors Council Logo.png";

const API_URL = API_CONFIG.endpointUrl;
const form = document.querySelector("#registrationForm");
const submitButton = form.querySelector('button[type="submit"]');
const status = document.querySelector("#formMessage");
const touched = new WeakSet();
let submitting = false;

const FAQS = [
  {
    question: "When and where will Sensors Summit 2026 take place?",
    answer: 'The summit is scheduled for November 12 and November 14, 2026, at <a href="https://maps.app.goo.gl/BhbY8ptNSHnDszbR6" target="_blank" rel="noopener noreferrer" class="link-inline">The British University in Egypt (BUE)</a>.'
  },
  {
    question: "What is the summit about?",
    answer: "The summit focuses on Digital Twin in Biosensing Applications and the intersection of sensing technologies, digital representations, and biosensing research."
  },
  {
    question: "Who can apply?",
    answer: "The intended audience includes academics, researchers, and senior students interested in sensing technologies and related research areas."
  },
  {
    question: "Is participation online or in person?",
    answer: "Participation is in person."
  },
  {
    question: "How much does registration cost?",
    answer: "The participation fee is EGP 200. The total fee is EGP 300 if transportation is selected."
  },
  {
    question: "Which payment methods are available?",
    answer: "The available methods are InstaPay and mobile wallet."
  },
  {
    question: "Does submitting the form guarantee acceptance?",
    answer: "No. All applications are reviewed by the organizing committee. Participants will receive the outcome by email."
  },
  {
    question: "What is the registration deadline?",
    answer: "The closing date and time will be announced after approval by the organizing committee."
  },
  {
    question: "How will I receive transportation details?",
    answer: "Transportation details will be sent by email after registration confirmation."
  },
  {
    question: "Who should I contact if I have a problem?",
    answer: 'Contact Eng. Amr Nabih at <a href="mailto:Amr_Nabih@ieee.org" class="link-inline">Amr_Nabih@ieee.org</a> or <a href="tel:+201212551698" class="link-inline">+20 121 255 1698</a> for registration, payment, upload, or technical assistance.'
  }
];

const PARTNERS = [
  {
    name: "FabLab Egypt",
    role: "Partner",
    logo: fablabLogo,
    logoAlt: "FabLab Egypt Logo - Partner"
  },
  {
    name: "ELEC",
    role: "Partner",
    logo: elecLogo,
    logoAlt: "ELEC Logo - Partner"
  },
  {
    name: "ASIS",
    role: "Partner",
    logo: asisLogo,
    logoAlt: "ASIS Logo - Partner"
  },
  {
    name: "DAAD Egypt",
    role: "Partner",
    logo: daadLogo,
    logoAlt: "DAAD Egypt Logo - Partner"
  },
  {
    name: "IEEE Sensors Council",
    role: "Partner",
    logo: ieeeSensorsCouncilLogo,
    logoAlt: "IEEE Sensors Council Logo - Partner"
  }
];
const FEATURED_PARTNER = "The British University in Egypt";

// Target: November 12, 2026, 09:00:00 AM in Africa/Cairo (standard time UTC+2)
const TARGET_SUMMIT_DATE_MS = new Date("2026-11-12T09:00:00+02:00").getTime();
let countdownInterval = null;

function initCountdown() {
  const container = document.querySelector("#countdownTimer");
  if (!container) return;

  const daysEl = container.querySelector("#countdownDays");
  const hoursEl = container.querySelector("#countdownHours");
  const minutesEl = container.querySelector("#countdownMinutes");
  const secondsEl = container.querySelector("#countdownSeconds");
  const bannerEl = container.querySelector("#countdownBanner");
  const gridEl = container.querySelector("#countdownGrid");

  function update() {
    const now = Date.now();
    const remaining = TARGET_SUMMIT_DATE_MS - now;

    if (remaining <= 0) {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      if (gridEl) gridEl.classList.add("hidden");
      if (bannerEl) {
        bannerEl.textContent = "The Summit Has Started!";
        bannerEl.classList.remove("hidden");
      }
      return;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (daysEl) daysEl.textContent = String(days).padStart(2, "0");
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, "0");
    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, "0");
    if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, "0");
  }

  update();
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(update, 1000);
}

function renderFaqs() {
  const container = document.querySelector("#faqList");
  if (!container) return;
  container.innerHTML = "";
  for (const item of FAQS) {
    const details = document.createElement("details");
    details.className = "faq-item";
    const summary = document.createElement("summary");
    summary.textContent = item.question;
    const answer = document.createElement("p");
    answer.innerHTML = item.answer;
    details.append(summary, answer);
    container.append(details);
  }
}

function renderPartners() {
  const container = document.querySelector("#partnerGrid");
  if (!container || container.children.length > 0) return;

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

function initScrollReveal() {
  const elements = document.querySelectorAll(".reveal-on-scroll");
  if (!elements.length) return;

  if (typeof IntersectionObserver === "undefined") {
    elements.forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        obs.unobserve(entry.target);
      }
    }
  }, {
    rootMargin: "0px 0px -40px 0px",
    threshold: 0.08
  });

  elements.forEach((el) => observer.observe(el));
}

populateCountries(document.querySelector("#mobileCountry"));
populateCountries(document.querySelector("#walletCountry"));
renderFaqs();
renderPartners();
initCountdown();
initScrollReveal();
initNav();
initPaymentInstructions();

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
  if (field.id === "transactionRef") touched.add(field);
  if (touched.has(field)) describeError(field, currentError(field));
});

const transactionRefInput = document.querySelector("#transactionRef");
if (transactionRefInput) {
  transactionRefInput.addEventListener("paste", () => {
    touched.add(transactionRefInput);
    queueMicrotask(() => describeError(transactionRefInput, currentError(transactionRefInput)));
  });
}

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
  status.classList.remove("hidden", "error", "success");
  if (isError) status.classList.add("error");
  else status.classList.add("success");
  status.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetConditionalPanels() {
  for (const id of [
    "ieeeNumberField", "nationalIdFields", "ambassadorCodeField", "studentFields", "graduateFields", "pickupField",
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
    if (key === "attendance" || key === "referralSources") {
      if (!data[key]) data[key] = [];
      data[key].push(value);
    } else {
      data[key] = typeof value === "string" ? value.trim() : value;
    }
  }

  if (!data.referralSources) {
    data.referralSources = [];
  }

  const consentEl = document.querySelector("#registrationConsent");
  data.registrationConsent = consentEl && consentEl.checked ? "Yes" : "No";

  if (data.referralSources.includes("Through an Ambassador")) {
    data.ambassadorCode = (data.ambassadorCode || "").trim();
  } else {
    delete data.ambassadorCode;
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
    const emailNotice = result.emailSent === false
      ? " Note: Your registration was saved, but confirmation email delivery could not be completed."
      : "";
    showStatus(`💚 Thank you for your interest in Sensors Summit 2026! We're excited to have you with us and look forward to seeing you at our upcoming activities. ✨${registrationId ? " " + registrationId : ""}${emailNotice ? " " + emailNotice : ""}`);
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
      ? "The request timed out. We could not submit your application. Please try again. If the problem continues, contact the organizing team."
      : "We could not submit your application. Please try again. If the problem continues, contact the organizing team.";
    showStatus(message, true);
  } finally {
    submitting = false;
    submitButton.disabled = false;
    submitButton.textContent = "Submit Registration Application";
  }
}

form.addEventListener("submit", submitRegistration, true);

const reviewBtn = document.querySelector("#reviewInfoBtn");
if (reviewBtn) {
  reviewBtn.addEventListener("click", () => {
    const target = document.querySelector("#fullName");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus();
    }
  });
}