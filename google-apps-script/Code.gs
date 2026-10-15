/**
 * Google Apps Script Backend for Sensors Summit 2026 Registration
 * 
 * Instructions:
 * 1. Open Google Sheets for Sensors Summit 2026 registrations.
 * 2. Extensions > Apps Script.
 * 3. Replace Code.gs with this implementation.
 * 4. Configure SPREADSHEET_ID and DRIVE_FOLDER_ID constants below.
 * 5. Deploy as Web App:
 *    - Execute as: Me
 *    - Who has access: Anyone
 */

const CONFIG = {
  SPREADSHEET_ID: "1H08Yof7XTfIxqEiN80Igx_9zdN9j6FPiH_zfzu2QoYc", // Paste Google Sheets ID here or leave empty to use SpreadsheetApp.getActiveSpreadsheet()
  SHEET_NAME: "Registrations",
  DRIVE_FOLDER_ID: "", // Optional Google Drive folder ID for uploads
  EMAIL_SENDER_NAME: "IEEE Sensors Summit 2026 Organizing Committee",
  ORGANIZER_EMAIL: "Amr_Nabih@ieee.org",  
  LOGO_FILE_IDS: {
  summitLogo: "1N3q-RqqAjDj6g-v1qwwxawgrKvD7q0OK",
  bueLogo: "18ov_CW2vdmjZrwGqLgTFmL2KXuVRlOLA",
  asisLogo: "18oUTtJ11HlUCxyhfBMOcTDXHFrFTbIxV",
  daadLogo: "1M5smwM6u3Vtj9dw6jQVrXJSOTFKoC9d1",
  fabLabLogo: "1thlf91ivWz67YVa0DROQWmYTMllUq-Vq",
  elecLogo: "1FO6G0IPi2B0HEkDBsH2sHZH3Abka_3qP",
  womenInSensorsLogo: "1Nbm-3POfg6Vyc8HNLglTb7zDbao72iJ2",
  sensorsCouncilLogo: "13teAdNfk5FvAIjfjLuxr1RigB6jkwdOU",
  sensorsEgyptLogo: "13Fyi0G6uAk-T1vpzoa5-KZt-HvfKVnNO"
}

};

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Wait up to 30s to prevent concurrent row write conflicts
  } catch (err) {
    return createJsonResponse({ success: false, message: "Server busy. Please try again in a few moments." });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, message: "Invalid or empty request payload." });
    }

    // 1. Payload size guard (prevent memory exhaustion DoS, max 15MB)
    if (e.postData.contents.length > 15 * 1024 * 1024) {
      return createJsonResponse({ success: false, message: "Request payload exceeds maximum allowed size." });
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ success: false, message: "Malformed JSON payload." });
    }

    // 2. Mandatory Data Processing Consent Validation
    if (data.registrationConsent !== "Yes" && data.registrationConsent !== true && data.registrationConsent !== "true") {
      return createJsonResponse({
        success: false,
        message: "Consent to the processing of personal data for event organizing is required."
      });
    }

    // 3. Category Determination & Status Validation
    const status = String(data.status || "").trim();
    const allowedStatuses = ["Student", "Graduate", "Graduate / Alumni", "Distinguished Guest / Professional"];
    if (!status || allowedStatuses.indexOf(status) === -1) {
      return createJsonResponse({
        success: false,
        message: "A valid registration category is required."
      });
    }

    const isGuest = status === "Distinguished Guest / Professional";
    const isGraduate = status === "Graduate" || status === "Graduate / Alumni";
    const isStudent = status === "Student";

    // 4. Core Identity & Contact Server-Side Validation
    const fullName = String(data.fullName || "").trim();
    if (fullName.length < 2 || fullName.length > 120) {
      return createJsonResponse({
        success: false,
        message: "Enter a valid full name (2–120 characters)."
      });
    }

    const email = String(data.email || "").trim().toLowerCase();
    if (!email || email.length > 254 || !isValidEmail(email)) {
      return createJsonResponse({
        success: false,
        message: "Please enter a valid email address."
      });
    }
    data.email = email;

    const mobile = String(data.mobile || "").trim();
    if (!mobile || mobile.length < 6 || mobile.length > 30) {
      return createJsonResponse({
        success: false,
        message: "Please enter a valid contact mobile number."
      });
    }

    // 5. Mandatory Referral Sources & Conditional Ambassador Code Validation
    const referralSources = Array.isArray(data.referralSources)
      ? data.referralSources
      : (data.referralSources ? [data.referralSources] : []);
    
    const hasAmbassador = referralSources.indexOf("Through an Ambassador") !== -1 || data.ambassadorReferral === "Yes";
    if (hasAmbassador) {
      if (!data.ambassadorCode || !String(data.ambassadorCode).trim()) {
        return createJsonResponse({
          success: false,
          message: "Please enter your Ambassador Code."
        });
      }
      data.ambassadorCode = String(data.ambassadorCode).trim().substring(0, 50);
    } else {
      delete data.ambassadorCode;
    }

    // 6. Anti-Replay & Duplicate Submission Debounce (60-second window per email + category)
    try {
      const cache = CacheService.getScriptCache();
      const rawKey = email + "_" + status + "_" + String(data.transactionRef || "");
      const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, rawKey);
      const debKey = "sub_" + Utilities.base64EncodeWebSafe(digest);
      if (cache.get(debKey)) {
        return createJsonResponse({
          success: false,
          message: "A registration with these details was recently received. Please wait a minute before submitting again."
        });
      }
      cache.put(debKey, "1", 60);
    } catch (cacheErr) {
      Logger.log("CacheService debounce notice: " + cacheErr.toString());
    }

    const attendanceList = Array.isArray(data.attendance)
      ? data.attendance
      : (data.attendance ? [data.attendance] : []);

    const hasDay1 = attendanceList.some(function(d) {
      const s = String(d).toLowerCase().trim();
      return s === "day 1" || s === "1" || s.indexOf("day 1") !== -1 || s.indexOf("nov 12") !== -1 || s.indexOf("november 12") !== -1 || s === "12";
    });
    const hasDay2 = attendanceList.some(function(d) {
      const s = String(d).toLowerCase().trim();
      return s === "day 2" || s === "2" || s.indexOf("day 2") !== -1 || s.indexOf("nov 14") !== -1 || s.indexOf("november 14") !== -1 || s === "14";
    });

    if (!isGuest && !hasDay1 && !hasDay2) {
      return createJsonResponse({
        success: false,
        message: "Please select at least one attendance day."
      });
    }

    if (isGuest) {
      if (hasDay2) {
        return createJsonResponse({
          success: false,
          message: "Distinguished Guest / Professional registration is restricted to Day 1 only."
        });
      }
      data.attendance = ["Day 1"];

      // Validate required questions for Distinguished Guest
      const profTitle = String(data.professionalTitle || data.guestTitle || "").trim();
      if (!profTitle) {
        return createJsonResponse({
          success: false,
          message: "What is your current professional or academic title? is required."
        });
      }
      if (profTitle === "Other") {
        const otherTitle = String(data.professionalTitleOther || data.guestTitleOther || "").trim();
        if (!otherTitle) {
          return createJsonResponse({
            success: false,
            message: "Please specify your title."
          });
        }
      }

      const org = String(data.organization || data.guestOrganization || "").trim();
      if (!org) {
        return createJsonResponse({
          success: false,
          message: "Which organization or institution do you represent? is required."
        });
      }

      const orgType = String(data.organizationType || data.guestOrganizationType || "").trim();
      if (!orgType) {
        return createJsonResponse({
          success: false,
          message: "What type of organization do you represent? is required."
        });
      }
      if (orgType === "Other") {
        const otherOrgType = String(data.organizationTypeOther || data.guestOrganizationTypeOther || "").trim();
        if (!otherOrgType) {
          return createJsonResponse({
            success: false,
            message: "Please specify organization type."
          });
        }
      }
    }

    // 4. Recalculate and validate fees on backend (Never trust frontend fee alone)
    let calculatedBaseFee = 0;
    if (isGuest) {
      calculatedBaseFee = 0;
    } else if (isStudent) {
      calculatedBaseFee = 200;
    } else if (isGraduate) {
      if (hasDay2) {
        calculatedBaseFee = 200;
      } else if (hasDay1) {
        calculatedBaseFee = 0;
      } else {
        calculatedBaseFee = 0;
      }
    } else {
      calculatedBaseFee = 200;
    }

    const transport = data.transport || "No transport";
    const hasTransport = transport && transport !== "No transport";
    let calculatedTransportFee = 0;
    if (isGuest) {
      calculatedTransportFee = 0;
    } else if (isGraduate) {
      calculatedTransportFee = (hasDay2 && hasTransport) ? 100 : 0;
    } else {
      calculatedTransportFee = hasTransport ? 100 : 0;
    }
    const calculatedTotalFee = calculatedBaseFee + calculatedTransportFee;
    data.totalFee = String(calculatedTotalFee);

    // 5. Strict 12-digit transaction reference validation
    // Payment is required for Student, and for Graduate / Alumni attending Day 2 (or both days).
    // Payment is NOT required for Distinguished Guest / Professional or Graduate / Alumni attending Day 1 only.
    const isPaymentRequired = isStudent || (isGraduate && hasDay2);
    let transactionRef = String(data.transactionRef || "").trim();
    if (isPaymentRequired && calculatedTotalFee > 0) {
      if (!/^[0-9]{12}$/.test(transactionRef)) {
        return createJsonResponse({
          success: false,
          message: "The transaction reference must contain exactly 12 digits."
        });
      }
    } else {
      transactionRef = "";
      data.paymentMethod = data.paymentMethod || "N/A";
    }

    // 6. Generate unique Registration ID & Server Timestamps
    const timestamp = new Date();
    const consentTimestamp = timestamp.toISOString();
    const registrationId = "SS26-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    data.registrationId = registrationId;

    // 7. Save uploaded files to Drive if provided
    let paymentProofUrl = "";
    let nationalIdFileUrl = "";

    if (data.files && typeof data.files === "object") {
      const folder = getUploadsFolder();
      if (data.files.paymentProof && data.files.paymentProof.base64 && isPaymentRequired && calculatedTotalFee > 0) {
        paymentProofUrl = saveBase64File(folder, data.files.paymentProof, `${registrationId}_PaymentProof`);
      }
      if (data.files.nationalIdFile && data.files.nationalIdFile.base64) {
        nationalIdFileUrl = saveBase64File(folder, data.files.nationalIdFile, `${registrationId}_NationalID`);
      }
    }

    // 8. Record to Google Sheets preserving the established 50-column schema
    const sheet = getRegistrationsSheet();
    ensureSheetHeaders(sheet);

    const finalJobTitle = isGuest
      ? (data.professionalTitle === "Other" ? (data.professionalTitleOther || "Other") : (data.professionalTitle || data.guestTitle || data.jobTitle || ""))
      : (data.jobTitle || "");

    const finalOrganization = isGuest
      ? (data.organization || data.guestOrganization || "")
      : (data.organization || "");

    const fieldMap = {
      "Registration ID": registrationId,
      "Submission Timestamp": timestamp.toISOString(),
      "Application Status": "Pending Review",
      "Payment Status": (!isPaymentRequired || calculatedTotalFee === 0) ? "Confirmed - Free" : "Pending Verification",
      "Refund Status": "N/A",
      "fullName": sanitizeForSheet(data.fullName),
      "mobile": sanitizeForSheet(data.mobile),
      "email": sanitizeForSheet(data.email),
      "gender": sanitizeForSheet(data.gender),
      "ieeeMember": sanitizeForSheet(data.ieeeMember),
      "ieeeNumber": sanitizeForSheet(data.ieeeNumber),
      "bueMember": sanitizeForSheet(data.bueMember),
      "nationalId": sanitizeForSheet(data.nationalId),
      "status": sanitizeForSheet(data.status),
      "studentDepartment": sanitizeForSheet(data.studentDepartment),
      "studentDepartmentOther": sanitizeForSheet(data.studentDepartmentOther),
      "university": sanitizeForSheet(data.university),
      "universityOther": sanitizeForSheet(data.universityOther),
      "studyYear": sanitizeForSheet(data.studyYear),
      "graduateDepartment": sanitizeForSheet(data.graduateDepartment),
      "graduateDepartmentOther": sanitizeForSheet(data.graduateDepartmentOther),
      "graduationPeriod": sanitizeForSheet(data.graduationPeriod),
      "graduationYearOther": sanitizeForSheet(data.graduationYearOther),
      "mastersStatus": sanitizeForSheet(data.mastersStatus),
      "mastersStart": sanitizeForSheet(data.mastersStart),
      "mastersExpected": sanitizeForSheet(data.mastersExpected),
      "mastersYear": sanitizeForSheet(data.mastersYear),
      "phdStatus": sanitizeForSheet(data.phdStatus),
      "phdStart": sanitizeForSheet(data.phdStart),
      "phdYear": sanitizeForSheet(data.phdYear),
      "jobTitle": sanitizeForSheet(finalJobTitle),
      "organization": sanitizeForSheet(finalOrganization),
      "attendance": sanitizeForSheet(Array.isArray(data.attendance) ? data.attendance.join(", ") : (data.attendance || "")),
      "transport": sanitizeForSheet(data.transport),
      "pickupLocation": sanitizeForSheet(data.pickupLocation),
      "paymentMethod": sanitizeForSheet(data.paymentMethod),
      "transactionRef": sanitizeForSheet(transactionRef),
      "paymentDate": sanitizeForSheet(data.paymentDate),
      "paymentTime": sanitizeForSheet(data.paymentTime),
      "recipientName": sanitizeForSheet(data.recipientName),
      "refundMethod": sanitizeForSheet(data.refundMethod),
      "instapayDetails": sanitizeForSheet(data.instapayDetails),
      "walletNumber": sanitizeForSheet(data.walletNumber),
      "totalFee": sanitizeForSheet(data.totalFee || "0"),
      "paymentProof": sanitizeForSheet(paymentProofUrl),
      "nationalIdFile": sanitizeForSheet(nationalIdFileUrl),
      "registrationConsent": "Yes",
      "consentTimestamp": consentTimestamp,
      "referralSources": sanitizeForSheet(referralSources.join(", ")),
      "ambassadorCode": sanitizeForSheet(data.ambassadorCode),
      // Optional extra columns if present in existing sheet
      "professionalTitle": sanitizeForSheet(data.professionalTitle || data.guestTitle),
      "professionalTitleOther": sanitizeForSheet((data.professionalTitle === "Other" || data.guestTitle === "Other") ? (data.professionalTitleOther || data.guestTitleOther || "") : ""),
      "guestOrganization": sanitizeForSheet(data.guestOrganization || data.organization),
      "organizationType": sanitizeForSheet(data.organizationType || data.guestOrganizationType),
      "organizationTypeOther": sanitizeForSheet((data.organizationType === "Other" || data.guestOrganizationType === "Other") ? (data.organizationTypeOther || data.guestOrganizationTypeOther || "") : "")
    };

    // Dynamically map values according to the actual header order of the sheet
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map(function(h) {
      const headerName = String(h).trim();
      return fieldMap.hasOwnProperty(headerName) ? fieldMap[headerName] : "";
    });

    sheet.appendRow(row);

    // 7. Send Branded Confirmation Email with Plain Text Fallback
    // Wrapped in dedicated helper so email failure does NOT report registration failure
    const emailResult = sendRegistrationReceipt(data, registrationId);

    return createJsonResponse({
      success: true,
      registrationId: registrationId,
      emailSent: emailResult.sent
    });

  } catch (err) {
    Logger.log("doPost Error: " + err.toString());
    return createJsonResponse({
      success: false,
      message: "An internal server error occurred while saving the registration."
    });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return createJsonResponse({
    status: "ok",
    service: "Sensors Summit 2026 Registration API",
    timestamp: new Date().toISOString()
  });
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getRegistrationsSheet() {
  const ss = CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }
  return sheet;
}

function ensureSheetHeaders(sheet) {
  const standardHeaders = [
    "Registration ID", "Submission Timestamp", "Application Status", "Payment Status", "Refund Status",
    "fullName", "mobile", "email", "gender", "ieeeMember", "ieeeNumber", "bueMember", "nationalId",
    "status", "studentDepartment", "studentDepartmentOther", "university", "universityOther", "studyYear",
    "graduateDepartment", "graduateDepartmentOther", "graduationPeriod", "graduationYearOther",
    "mastersStatus", "mastersStart", "mastersExpected", "mastersYear",
    "phdStatus", "phdStart", "phdYear", "jobTitle", "organization",
    "attendance", "transport", "pickupLocation", "paymentMethod", "transactionRef",
    "paymentDate", "paymentTime", "recipientName", "refundMethod", "instapayDetails",
    "walletNumber", "totalFee", "paymentProof", "nationalIdFile",
    "registrationConsent", "consentTimestamp", "referralSources", "ambassadorCode"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(standardHeaders);
    sheet.getRange(1, 1, 1, standardHeaders.length)
      .setFontWeight("bold")
      .setBackground("#002855")
      .setFontColor("#FFFFFF");
  }
}

function getUploadsFolder() {
  if (CONFIG.DRIVE_FOLDER_ID) {
    return DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  }
  return DriveApp.getRootFolder();
}

function sanitizeForSheet(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Neutralize formula injection characters (=, +, -, @, tab, newline, carriage return)
  // including strings with leading whitespace
  if (/^\s*[=+\-@\t\r\n]/.test(str)) {
    return "'" + str;
  }
  return str;
}

function isValidFileType(decodedBytes, declaredMime, filename) {
  if (!decodedBytes || decodedBytes.length < 4) return false;

  const b0 = decodedBytes[0] & 0xFF;
  const b1 = decodedBytes[1] & 0xFF;
  const b2 = decodedBytes[2] & 0xFF;
  const b3 = decodedBytes[3] & 0xFF;

  const ext = (filename.split('.').pop() || '').toLowerCase();

  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (b0 === 0x25 && b1 === 0x50 && b2 === 0x44 && b3 === 0x46) {
    return declaredMime === "application/pdf" && ext === "pdf";
  }

  // PNG: \x89PNG (0x89 0x50 0x4E 0x47)
  if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4E && b3 === 0x47) {
    return declaredMime === "image/png" && ext === "png";
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (b0 === 0xFF && b1 === 0xD8 && b2 === 0xFF) {
    return declaredMime === "image/jpeg" && (ext === "jpg" || ext === "jpeg");
  }

  return false;
}

function saveBase64File(folder, fileObj, filePrefix) {
  if (!fileObj || !fileObj.base64 || typeof fileObj.base64 !== "string") {
    return "";
  }

  try {
    // 1. Basic length check on base64 string (approx 5MB binary is ~6.7MB base64)
    if (fileObj.base64.length > 7 * 1024 * 1024) {
      Logger.log("File payload exceeds 5 MB limit.");
      return "";
    }

    const decoded = Utilities.base64Decode(fileObj.base64);
    if (!decoded || decoded.length === 0 || decoded.length > 5 * 1024 * 1024) {
      Logger.log("Decoded file exceeds 5 MB limit or is empty.");
      return "";
    }

    const declaredMime = String(fileObj.mimeType || "").toLowerCase().trim();
    const rawName = String(fileObj.name || "").trim();

    // 2. Validate MIME type, extension, and binary magic bytes
    if (!isValidFileType(decoded, declaredMime, rawName)) {
      Logger.log("File rejected: MIME type, extension, or magic bytes signature mismatch.");
      return "";
    }

    // 3. Determine verified extension & sanitize filename
    const ext = declaredMime === "application/pdf" ? "pdf" : (declaredMime === "image/png" ? "png" : "jpg");
    const safeBaseName = rawName.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50) || "upload";
    const sanitizedFileName = `${filePrefix}_${safeBaseName}.${ext}`;

    const blob = Utilities.newBlob(decoded, declaredMime, sanitizedFileName);
    const file = folder.createFile(blob);
    return file.getUrl();
  } catch (e) {
    Logger.log("File save failed: " + e.toString());
    return "";
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sendRegistrationReceipt(data, registrationId) {
  if (!data.email || !isValidEmail(data.email)) {
    return { sent: false, error: "Invalid or missing recipient email" };
  }

  // Check remaining daily email quota
  try {
    if (typeof MailApp.getRemainingDailyEmails === "function") {
      const remainingQuota = MailApp.getRemainingDailyEmails();
      if (remainingQuota <= 0) {
        Logger.log("Daily email quota exhausted. Skipping email dispatch.");
        return { sent: false, error: "Daily email quota exhausted" };
      }
    }
  } catch (quotaErr) {
    Logger.log("Could not check email quota: " + quotaErr.toString());
  }

  try {
    const inlineImages = getInlineLogoBlobs();
    const isGuest = data.status === "Distinguished Guest / Professional";
    const uniOrOrg = data.university === "Other"
      ? (data.universityOther || "Other")
      : (data.university || data.organization || data.guestOrganization || "Not specified");

    const rawTransport = data.transport || "No transport";
    const hasTransport = rawTransport && rawTransport !== "No transport";
    const pickup = rawTransport && rawTransport.indexOf("Other") !== -1 && data.pickupLocation
      ? " (" + data.pickupLocation + ")"
      : "";

    let transportDisplay = "";
    let transportFeeDisplay = "";
    if (isGuest) {
      if (hasTransport) {
        transportDisplay = rawTransport + pickup + " (Complimentary)";
        transportFeeDisplay = "0 EGP (Complimentary)";
      } else {
        transportDisplay = "No transport";
        transportFeeDisplay = "0 EGP";
      }
    } else {
      if (hasTransport) {
        transportDisplay = rawTransport + pickup;
        transportFeeDisplay = "100 EGP";
      } else {
        transportDisplay = "No transport";
        transportFeeDisplay = "0 EGP";
      }
    }

    const totalFeeVal = isGuest ? "0" : (data.totalFee !== undefined && data.totalFee !== null ? String(data.totalFee) : "200");
    const totalFeeDisplay = isGuest || totalFeeVal === "0" ? "0 EGP (Free Registration)" : totalFeeVal + " EGP";

    const noticeText = isGuest || totalFeeVal === "0"
      ? "Please note that all registration applications are subject to review by the organizing committee. This email confirms that your registration details have been received; it does not constitute final event acceptance until approved."
      : "Please note that all registration applications are subject to review by the organizing committee. This email confirms that your details and payment records have been received; it does not constitute final event acceptance or payment verification until approved.";
    const emailHtml = generateEmailHtml(data);
    const plainTextBody = 
`Sensors Summit 2026 - Registration Received

Thank You, ${data.fullName || "Applicant"}!

Your registration application for Sensors Summit 2026 has been received by the organizing committee.
Registration Reference ID: ${registrationId}

Important Notice:
${noticeText}

Submitted Application Summary:
- Full Name: ${data.fullName || ""}
- Email: ${data.email || ""}
- Mobile: ${data.mobile || ""}
- Status: ${data.status || ""}
- University / Organization: ${uniOrOrg}
- Attendance Days: ${Array.isArray(data.attendance) ? data.attendance.join(", ") : (data.attendance || "Not selected")}
- Transportation: ${transportDisplay}
- Transportation Fee: ${transportFeeDisplay}
- Total Registration Fee: ${totalFeeDisplay}
- Referral Sources: ${Array.isArray(data.referralSources) ? data.referralSources.join(", ") : (data.referralSources || "None selected")}${data.ambassadorCode ? "\n- Ambassador Code: " + data.ambassadorCode : ""}

*For privacy and security, sensitive identification numbers${isGuest || totalFeeVal === "0" ? "" : ", payment transaction references,"} and uploaded document attachments are not displayed in email communications.

Event Details:
- Theme: Digital Twin in Biosensing Applications
- Dates: November 12 (Day 1 Talks & Keynotes) and November 14 (Day 2 Workshop)
- Venue: The British University in Egypt (BUE), El Sherouk City, Cairo, Egypt
- Maps: https://maps.app.goo.gl/BhbY8ptNSHnDszbR6

For inquiries, contact Eng. Amr Nabih at Amr_Nabih@ieee.org or +20 121 255 1698.

Organized by IEEE Sensors Council Egypt Chapter
Hosted at The British University in Egypt (BUE)
Main Sponsor: IEEE Women in Sensors
Partners: FabLab Egypt, ELEC, ASIS, DAAD Egypt, IEEE Sensors Council

Connect with IEEE Sensors Council Egypt Chapter:
- Email: egypt-sensorcouncil@ieee.org
- YouTube: https://youtube.com/@ieeesensorscouncilegyptchapter?si=zNRtidcjJWh7_-bp
- WhatsApp: https://whatsapp.com/channel/0029Vb1iNb7HwXb6x98p8d0p
- LinkedIn: https://www.linkedin.com/company/ieee-sensors-council-egypt-chapter/
- Instagram: https://www.instagram.com/sensorscouncilegypt?igsh=bWQ0ZDljeG1nZnlj
- Facebook: https://www.facebook.com/share/1DX3SxsE77/
- Website: https://r8.ieee.org/egypt-sensor-council/`;

    
MailApp.sendEmail({
  to: data.email,
  subject: `Sensors Summit 2026 - Registration Received [${registrationId}]`,
  body: plainTextBody,
  htmlBody: emailHtml,
  inlineImages: inlineImages,
  name: CONFIG.EMAIL_SENDER_NAME,
  replyTo: CONFIG.ORGANIZER_EMAIL
});
return { sent: true };
} catch (err) {
  Logger.log("Email dispatch failed for " + data.email + ": " + err.toString());
  return { sent: false, error: err.toString() };
}
}

function generateEmailHtml(data) {
  const fullName = escapeHtml(data.fullName || "Applicant");
  const email = escapeHtml(data.email || "");
  const mobile = escapeHtml(data.mobile || "");
  const status = escapeHtml(data.status || "");
  const isGuest = data.status === "Distinguished Guest / Professional";
  const universityOrOrg = escapeHtml(
    data.university === "Other"
      ? (data.universityOther || "Other")
      : (data.university || data.organization || data.guestOrganization || "Not specified")
  );
  let departmentOrTitle = "";
  if (data.status === "Student") {
    departmentOrTitle = data.studentDepartment === "Other" ? data.studentDepartmentOther : data.studentDepartment;
  } else if (data.status === "Graduate" || data.status === "Graduate / Alumni") {
    departmentOrTitle = data.graduateDepartment === "Other" ? data.graduateDepartmentOther : data.graduateDepartment;
  } else if (isGuest) {
    departmentOrTitle = data.professionalTitle === "Other"
      ? (data.professionalTitleOther || "Other")
      : (data.professionalTitle || (data.guestTitle === "Other" ? data.guestTitleOther : data.guestTitle) || data.jobTitle);
  }
  const department = escapeHtml(departmentOrTitle || "Not specified");
  const attendanceList = Array.isArray(data.attendance) ? data.attendance.map(escapeHtml).join(", ") : escapeHtml(data.attendance || "Not selected");
  const rawTransport = data.transport || "No transport";
  const hasTransport = rawTransport && rawTransport !== "No transport";
  const pickup = rawTransport && rawTransport.indexOf("Other") !== -1 && data.pickupLocation
    ? " (" + escapeHtml(data.pickupLocation) + ")"
    : "";

  let transportDisplay = "";
  let transportFeeDisplay = "";
  if (isGuest) {
    if (hasTransport) {
      transportDisplay = escapeHtml(rawTransport) + pickup + " (Complimentary)";
      transportFeeDisplay = "0 EGP (Complimentary)";
    } else {
      transportDisplay = "No transport";
      transportFeeDisplay = "0 EGP";
    }
  } else {
    if (hasTransport) {
      transportDisplay = escapeHtml(rawTransport) + pickup;
      transportFeeDisplay = "100 EGP";
    } else {
      transportDisplay = "No transport";
      transportFeeDisplay = "0 EGP";
    }
  }

  const totalFeeVal = isGuest ? "0" : (data.totalFee !== undefined && data.totalFee !== null ? String(data.totalFee) : "200");
  const totalFeeDisplay = isGuest || totalFeeVal === "0" ? "0 EGP (Free Registration)" : escapeHtml(totalFeeVal) + " EGP";
  const registrationId = escapeHtml(data.registrationId || "");
  const referralSources = Array.isArray(data.referralSources)
    ? data.referralSources.map(escapeHtml).join(", ")
    : escapeHtml(data.referralSources || (data.ambassadorReferral === "Yes" ? "Through an Ambassador" : (data.ambassadorReferral || "None selected")));
  const hasAmbassador = Array.isArray(data.referralSources)
    ? data.referralSources.includes("Through an Ambassador")
    : (String(data.referralSources || "").includes("Through an Ambassador") || data.ambassadorReferral === "Yes");
  const ambassadorCode = hasAmbassador && data.ambassadorCode ? escapeHtml(data.ambassadorCode) : null;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Sensors Summit 2026 - Registration Received</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F7FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2D3E50;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F7FA; padding: 24px 12px;">
    <tr><td align="center">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background-color: #FFFFFF; border-radius: 10px; overflow: hidden; border: 1px solid #D1DCE5;">
        <!-- Header -->
        <tr>
           <td align="center" style="background-color: #002855; padding: 32px 24px 20px; border-bottom: 2px solid #00B5E2;">
           <img src="cid:summitLogo" alt="Sensors Summit 2026 Logo" width="220" style="display: block; width: 220px; max-width: 100%; height: auto; border: 0;" />
           <p style="margin: 10px 0 0; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #FFFFFF; font-family: 'Courier New', monospace;">
            IEEE Sensors Council Egypt Chapter
           </p>
           </td>
        </tr>
        <!-- Banner -->
        <tr>
          <td style="background-color: #002855; padding: 28px 32px; color: #FFFFFF;">
            <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #00B5E2; font-family: 'Courier New', monospace;">
              Application Received
            </span>
            <h1 style="margin: 8px 0; font-size: 22px; color: #FFFFFF;">Thank You, ${fullName}!</h1>
            <p style="margin: 0; font-size: 14px; color: #E1EDF7; line-height: 1.5;">
              Your application for <strong>Sensors Summit 2026</strong> has been received by the organizing committee.
            </p>
            ${registrationId ? `
            <div style="margin-top: 12px; padding: 8px 12px; background-color: rgba(0, 181, 226, 0.15); border-left: 3px solid #00B5E2; border-radius: 4px; font-size: 13px; color: #FFFFFF; font-family: 'Courier New', monospace;">
              <strong>Registration Reference ID:</strong> ${registrationId}
            </div>` : ""}
          </td>
        </tr>
        <!-- Review Notice -->
        <tr>
          <td style="padding: 24px 32px 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #EBF5FB; border-left: 4px solid #00629B; border-radius: 6px; padding: 14px 18px;">
              <tr><td>
                <strong style="color: #002855; font-size: 14px; display: block; margin-bottom: 4px;">Application Under Review</strong>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #2D3E50;">
                  ${isGuest || totalFeeVal === "0"
                    ? "Please note that all registration applications are subject to review by the organizing committee. This email confirms that your registration details have been received; it does not constitute final event acceptance until approved."
                    : "Please note that all registration applications are subject to review by the organizing committee. This email confirms that your details and payment records have been received; it does not constitute final event acceptance or payment verification until approved."}
                </p>
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Summary Table -->
        <tr>
          <td style="padding: 24px 32px;">
            <h2 style="margin: 0 0 14px; font-size: 16px; font-weight: 700; color: #002855; border-bottom: 1px solid #E2ECF4; padding-bottom: 8px;">Submitted Application Summary</h2>
            <table border="0" cellpadding="6" cellspacing="0" width="100%" style="font-size: 13px; color: #2D3E50;">
              <tr><td width="38%" style="color: #5A6E82;"><strong>Full Name:</strong></td><td>${fullName}</td></tr>
              <tr><td style="color: #5A6E82;"><strong>Email Address:</strong></td><td>${email}</td></tr>
              <tr><td style="color: #5A6E82;"><strong>Mobile Number:</strong></td><td>${mobile}</td></tr>
              <tr><td style="color: #5A6E82;"><strong>Status &amp; Affiliation:</strong></td><td>${status} &middot; ${universityOrOrg} (${department})</td></tr>
              <tr><td style="color: #5A6E82;"><strong>Attendance Days:</strong></td><td>${attendanceList}</td></tr>
              <tr><td style="color: #5A6E82;"><strong>Transportation:</strong></td><td>${transportDisplay}</td></tr>
              <tr><td style="color: #5A6E82;"><strong>Transportation Fee:</strong></td><td>${transportFeeDisplay}</td></tr>
              <tr><td style="color: #5A6E82;"><strong>Total Registration Fee:</strong></td><td style="color: #0B6623; font-weight: 700;">${totalFeeDisplay}</td></tr>
              <tr><td style="color: #5A6E82;"><strong>Referral Sources:</strong></td><td>${referralSources}</td></tr>
              ${ambassadorCode ? `<tr><td style="color: #5A6E82;"><strong>Ambassador Code:</strong></td><td style="color: #00629B; font-weight: 600;">${ambassadorCode}</td></tr>` : ""}
            </table>
            <p style="margin: 12px 0 0; font-size: 11px; color: #8A9CAE; font-style: italic;">
              ${isGuest || totalFeeVal === "0"
                ? "*For your privacy and security, sensitive identification numbers and uploaded document attachments are not displayed in email communications."
                : "*For your privacy and security, sensitive identification numbers, payment transaction references, and uploaded document attachments are not displayed in email communications."}
            </p>
          </td>
        </tr>
        <!-- Event Details -->
        <tr>
          <td style="padding: 0 32px 24px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #D1DCE5; border-radius: 8px; padding: 20px;">
              <tr><td>
                <span style="font-size: 11px; font-weight: 700; color: #00629B; text-transform: uppercase; font-family: 'Courier New', monospace;">Event Details</span>
                <h3 style="margin: 4px 0 8px; font-size: 16px; color: #002855;">Sensors Summit 2026: Digital Twin in Biosensing Applications</h3>
                <p style="margin: 0 0 6px; font-size: 13px; color: #2D3E50;"><strong>Dates:</strong> November 12 (Day 1 Talks &amp; Keynotes) &middot; November 14 (Day 2 Workshop)</p>
                <p style="margin: 0; font-size: 13px; color: #2D3E50;"><strong>Venue:</strong> <a href="https://maps.app.goo.gl/BhbY8ptNSHnDszbR6" target="_blank" style="color: #00629B; text-decoration: underline; font-weight: 600;">The British University in Egypt (BUE), El Sherouk City, Cairo ↗</a></p>
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Contact -->
        <tr>
          <td style="padding: 0 32px 24px; border-bottom: 1px solid #E2ECF4;">
            <h3 style="margin: 0 0 6px; font-size: 14px; color: #002855;">Need Assistance?</h3>
            <p style="margin: 0; font-size: 13px; color: #2D3E50;">
              Eng. Amr Nabih &middot; <a href="mailto:Amr_Nabih@ieee.org" style="color: #00629B; text-decoration: underline;">Amr_Nabih@ieee.org</a> &middot; <a href="tel:+201212551698" style="color: #00629B; text-decoration: underline;">+20 121 255 1698</a>
            </p>
          </td>
        </tr>
        <!-- Footer Logos & Social Links -->
        <tr>
          <td align="center" style="background-color: #FFFFFF; padding: 24px 24px 20px;">
            <p style="margin: 0 0 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #5A6E82; font-family: 'Courier New', monospace;">
              Organized By &middot; Hosted At &middot; Supported By
            </p>
            <table border="0" cellpadding="6" cellspacing="0" style="margin-bottom: 12px;">
              <tr>
                <td align="center" style="padding: 6px 10px;"><img src="cid:sensorsEgyptLogo" alt="IEEE Sensors Council Egypt Chapter" height="38" style="display: block; height: 38px; width: auto;" /></td>
                <td align="center" style="padding: 6px 10px;"><img src="cid:bueLogo" alt="BUE" height="38" style="display: block; height: 38px; width: auto;" /></td>
                <td align="center" style="padding: 6px 10px;"><img src="cid:womenInSensorsLogo" alt="IEEE Women in Sensors" height="38" style="display: block; height: 38px; width: auto;" /></td>
              </tr>
            </table>
            <table border="0" cellpadding="4" cellspacing="0" style="margin-bottom: 16px;">
              <tr>
                <td align="center" style="padding: 4px 6px;"><img src="cid:fabLabLogo" alt="FabLab" height="26" style="display: block; height: 26px; width: auto;" /></td>
                <td align="center" style="padding: 4px 6px;"><img src="cid:elecLogo" alt="ELEC" height="26" style="display: block; height: 26px; width: auto;" /></td>
                <td align="center" style="padding: 4px 6px;"><img src="cid:asisLogo" alt="ASIS" height="26" style="display: block; height: 26px; width: auto;" /></td>
                <td align="center" style="padding: 4px 6px;"><img src="cid:daadLogo" alt="DAAD" height="26" style="display: block; height: 26px; width: auto;" /></td>
                <td align="center" style="padding: 4px 6px;"><img src="cid:sensorsCouncilLogo" alt="IEEE Sensors Council" height="26" style="display: block; height: 26px; width: auto;" /></td>
              </tr>
            </table>

            <!-- Connect with IEEE Sensors Council Egypt Chapter -->
            <table border="0" cellpadding="0" cellspacing="0" style="margin: 16px auto 10px; text-align: center;">
              <tr>
                <td align="center" style="font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #00629B; font-family: 'Courier New', monospace; padding-bottom: 6px;">
                  Connect with IEEE Sensors Council Egypt Chapter
                </td>
              </tr>
              <tr>
                <td align="center">
                  <table border="0" cellpadding="3" cellspacing="0">
                    <tr>
                      <td style="padding: 3px 6px;"><a href="mailto:egypt-sensorcouncil@ieee.org" style="color: #00629B; text-decoration: underline; font-size: 11px; font-weight: 600;">Email</a></td>
                      <td style="color: #CBD5E1; font-size: 11px;">&middot;</td>
                      <td style="padding: 3px 6px;"><a href="https://youtube.com/@ieeesensorscouncilegyptchapter?si=zNRtidcjJWh7_-bp" target="_blank" style="color: #00629B; text-decoration: underline; font-size: 11px; font-weight: 600;">YouTube</a></td>
                      <td style="color: #CBD5E1; font-size: 11px;">&middot;</td>
                      <td style="padding: 3px 6px;"><a href="https://whatsapp.com/channel/0029Vb1iNb7HwXb6x98p8d0p" target="_blank" style="color: #00629B; text-decoration: underline; font-size: 11px; font-weight: 600;">WhatsApp</a></td>
                      <td style="color: #CBD5E1; font-size: 11px;">&middot;</td>
                      <td style="padding: 3px 6px;"><a href="https://www.linkedin.com/company/ieee-sensors-council-egypt-chapter/" target="_blank" style="color: #00629B; text-decoration: underline; font-size: 11px; font-weight: 600;">LinkedIn</a></td>
                      <td style="color: #CBD5E1; font-size: 11px;">&middot;</td>
                      <td style="padding: 3px 6px;"><a href="https://www.instagram.com/sensorscouncilegypt?igsh=bWQ0ZDljeG1nZnlj" target="_blank" style="color: #00629B; text-decoration: underline; font-size: 11px; font-weight: 600;">Instagram</a></td>
                      <td style="color: #CBD5E1; font-size: 11px;">&middot;</td>
                      <td style="padding: 3px 6px;"><a href="https://www.facebook.com/share/1DX3SxsE77/" target="_blank" style="color: #00629B; text-decoration: underline; font-size: 11px; font-weight: 600;">Facebook</a></td>
                      <td style="color: #CBD5E1; font-size: 11px;">&middot;</td>
                      <td style="padding: 3px 6px;"><a href="https://r8.ieee.org/egypt-sensor-council/" target="_blank" style="color: #00629B; text-decoration: underline; font-size: 11px; font-weight: 600;">Website</a></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin: 16px 0 0; font-size: 11px; color: #8A9CAE; line-height: 1.5;">
              &copy; 2026 Sensors Summit &middot; IEEE Sensors Council Egypt Chapter<br/>
              The British University in Egypt (BUE), El Sherouk City, Cairo Governorate, Egypt
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function testSpreadsheetAccess() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  Logger.log("Spreadsheet name: " + ss.getName());
  Logger.log("Sheet found: " + (sheet !== null));
  Logger.log("Sheet name: " + (sheet ? sheet.getName() : "Not found"));
}

function getInlineLogoBlobs() {
  const logos = {};
  const logoIds = CONFIG.LOGO_FILE_IDS || {};

  Object.keys(logoIds).forEach(function (key) {
    try {
      const fileId = logoIds[key];
      if (!fileId) return;

      const file = DriveApp.getFileById(fileId);
      const blob = file.getBlob();
      const contentType = (blob.getContentType() || "").toLowerCase();

      if (!contentType.startsWith("image/")) {
        throw new Error("The Drive file is not an image (" + contentType + "): " + key);
      }

      // Preserve the correct file extension according to original filename or MIME type
      let ext = "";
      const originalName = file.getName() || "";
      const dotIndex = originalName.lastIndexOf(".");
      if (dotIndex !== -1) {
        ext = originalName.substring(dotIndex).toLowerCase();
      } else {
        if (contentType === "image/jpeg" || contentType === "image/jpg") ext = ".jpg";
        else if (contentType === "image/png") ext = ".png";
        else if (contentType === "image/gif") ext = ".gif";
        else if (contentType === "image/webp") ext = ".webp";
        else if (contentType === "image/svg+xml") ext = ".svg";
        else ext = ".png";
      }

      logos[key] = blob.setName(key + ext);
    } catch (err) {
      Logger.log("Logo loading failed for " + key + ": " + err.toString());
    }
  });

  return logos;
}

function testLogoAccess() {
  const logoIds = CONFIG.LOGO_FILE_IDS || {};
  const results = [];

  Object.keys(logoIds).forEach(function (key) {
    try {
      const fileId = logoIds[key];
      const file = DriveApp.getFileById(fileId);
      const blob = file.getBlob();

      results.push({
        logo: key,
        fileId: fileId,
        status: "OK",
        fileName: file.getName(),
        contentType: blob.getContentType(),
        sizeBytes: blob.getBytes().length
      });
    } catch (err) {
      results.push({
        logo: key,
        fileId: logoIds[key],
        status: "FAILED",
        error: err.toString()
      });
    }
  });

  Logger.log(JSON.stringify(results, null, 2));
  return results;
}

function testRegistrationEmail() {
  const testData = {
    email: CONFIG.ORGANIZER_EMAIL,
    fullName: "Test Applicant",
    mobile: "+20 100 000 0000",
    status: "Student",
    university: "Test University",
    studentDepartment: "Electronics and Communication",
    attendance: ["November 12", "November 14"],
    transport: "No transport",
    totalFee: "200",
    referralSources: ["Social Media"],
    registrationId: "SS26-TEST123"
  };

  const inlineImages = getInlineLogoBlobs();
  const emailHtml = generateEmailHtml(testData);

  MailApp.sendEmail({
    to: CONFIG.ORGANIZER_EMAIL,
    subject: "TEST - Sensors Summit 2026 Email Logos",
    body: "This is a test email to verify the Sensors Summit logos.",
    htmlBody: emailHtml,
    inlineImages: inlineImages,
    name: CONFIG.EMAIL_SENDER_NAME,
    replyTo: CONFIG.ORGANIZER_EMAIL
  });

  Logger.log("Test email sent to " + CONFIG.ORGANIZER_EMAIL);
}

