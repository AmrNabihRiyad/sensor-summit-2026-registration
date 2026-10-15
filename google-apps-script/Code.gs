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
    lock.waitLock(15000); // Wait up to 15s to prevent concurrent row write conflicts
  } catch (err) {
    return createJsonResponse({ success: false, message: "Server busy. Please try again in a few moments." });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, message: "Invalid or empty request payload." });
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ success: false, message: "Malformed JSON payload." });
    }

    // 1. Mandatory Data Processing Consent Validation
    if (data.registrationConsent !== "Yes" && data.registrationConsent !== true && data.registrationConsent !== "true") {
      return createJsonResponse({
        success: false,
        message: "Consent to the processing of personal data for event organizing is required."
      });
    }

    // 2. Mandatory Referral Sources & Conditional Ambassador Code Validation
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
      data.ambassadorCode = String(data.ambassadorCode).trim();
    } else {
      delete data.ambassadorCode;
    }

    // 3. Strict 12-digit transaction reference validation
    const transactionRef = String(data.transactionRef || "").trim();
    if (!/^[0-9]{12}$/.test(transactionRef)) {
      return createJsonResponse({
        success: false,
        message: "The transaction reference must contain exactly 12 digits."
      });
    }

    // 4. Generate unique Registration ID & Server Timestamps
    const timestamp = new Date();
    const consentTimestamp = timestamp.toISOString();
    const registrationId = "SS26-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    data.registrationId = registrationId;

    // 5. Save uploaded files to Drive if provided
    let paymentProofUrl = "";
    let nationalIdFileUrl = "";

    if (data.files && typeof data.files === "object") {
      const folder = getUploadsFolder();
      if (data.files.paymentProof && data.files.paymentProof.base64) {
        paymentProofUrl = saveBase64File(folder, data.files.paymentProof, `${registrationId}_PaymentProof`);
      }
      if (data.files.nationalIdFile && data.files.nationalIdFile.base64) {
        nationalIdFileUrl = saveBase64File(folder, data.files.nationalIdFile, `${registrationId}_NationalID`);
      }
    }

    // 6. Record to Google Sheets with exact 50-column schema
    const sheet = getRegistrationsSheet();
    ensureSheetHeaders(sheet);

    const row = [
      registrationId,                                                 // 1. Registration ID
      timestamp.toISOString(),                                        // 2. Submission Timestamp
      "Pending Review",                                               // 3. Application Status
      "Pending Verification",                                         // 4. Payment Status
      "N/A",                                                          // 5. Refund Status
      data.fullName || "",                                            // 6. fullName
      data.mobile || "",                                              // 7. mobile
      data.email || "",                                               // 8. email
      data.gender || "",                                              // 9. gender
      data.ieeeMember || "",                                          // 10. ieeeMember
      data.ieeeNumber || "",                                          // 11. ieeeNumber
      data.bueMember || "",                                           // 12. bueMember
      data.nationalId || "",                                          // 13. nationalId
      data.status || "",                                              // 14. status
      data.studentDepartment || "",                                   // 15. studentDepartment
      data.studentDepartmentOther || "",                              // 16. studentDepartmentOther
      data.university || "",                                          // 17. university
      data.universityOther || "",                                     // 18. universityOther
      data.studyYear || "",                                           // 19. studyYear
      data.graduateDepartment || "",                                  // 20. graduateDepartment
      data.graduateDepartmentOther || "",                             // 21. graduateDepartmentOther
      data.graduationPeriod || "",                                    // 22. graduationPeriod
      data.graduationYearOther || "",                                 // 23. graduationYearOther
      data.mastersStatus || "",                                       // 24. mastersStatus
      data.mastersStart || "",                                        // 25. mastersStart
      data.mastersExpected || "",                                     // 26. mastersExpected
      data.mastersYear || "",                                         // 27. mastersYear
      data.phdStatus || "",                                           // 28. phdStatus
      data.phdStart || "",                                            // 29. phdStart
      data.phdYear || "",                                             // 30. phdYear
      data.jobTitle || "",                                            // 31. jobTitle
      data.organization || "",                                        // 32. organization
      Array.isArray(data.attendance) ? data.attendance.join(", ") : (data.attendance || ""), // 33. attendance
      data.transport || "",                                           // 34. transport
      data.pickupLocation || "",                                      // 35. pickupLocation
      data.paymentMethod || "",                                       // 36. paymentMethod
      transactionRef,                                                 // 37. transactionRef
      data.paymentDate || "",                                         // 38. paymentDate
      data.paymentTime || "",                                         // 39. paymentTime
      data.recipientName || "",                                       // 40. recipientName
      data.refundMethod || "",                                        // 41. refundMethod
      data.instapayDetails || "",                                     // 42. instapayDetails
      data.walletNumber || "",                                        // 43. walletNumber
      data.totalFee || "",                                            // 44. totalFee
      paymentProofUrl,                                                // 45. paymentProof
      nationalIdFileUrl,                                              // 46. nationalIdFile
      "Yes",                                                          // 47. registrationConsent
      consentTimestamp,                                               // 48. consentTimestamp
      referralSources.join(", "),                                     // 49. referralSources
      data.ambassadorCode || ""                                       // 50. ambassadorCode
    ];

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
  const requiredHeaders = [
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
    sheet.appendRow(requiredHeaders);
    sheet.getRange(1, 1, 1, requiredHeaders.length)
      .setFontWeight("bold")
      .setBackground("#002855")
      .setFontColor("#FFFFFF");
  } else {
    // Check if new columns need to be appended at the end without reordering existing data
    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const missingHeaders = [];
    for (var i = 0; i < requiredHeaders.length; i++) {
      if (existingHeaders.indexOf(requiredHeaders[i]) === -1) {
        missingHeaders.push(requiredHeaders[i]);
      }
    }
    if (missingHeaders.length > 0) {
      const startCol = sheet.getLastColumn() + 1;
      const range = sheet.getRange(1, startCol, 1, missingHeaders.length);
      range.setValues([missingHeaders]);
      range.setFontWeight("bold")
        .setBackground("#002855")
        .setFontColor("#FFFFFF");
    }
  }
}

function getUploadsFolder() {
  if (CONFIG.DRIVE_FOLDER_ID) {
    return DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  }
  return DriveApp.getRootFolder();
}

function saveBase64File(folder, fileObj, filePrefix) {
  try {
    const decoded = Utilities.base64Decode(fileObj.base64);
    const blob = Utilities.newBlob(decoded, fileObj.mimeType || "application/octet-stream", `${filePrefix}_${fileObj.name}`);
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

  try {
    const inlineImages = getInlineLogoBlobs();
    const emailHtml = generateEmailHtml(data);
    const plainTextBody = 
`Sensors Summit 2026 - Registration Received

Thank You, ${data.fullName || "Applicant"}!

Your registration application for Sensors Summit 2026 has been received by the organizing committee.
Registration Reference ID: ${registrationId}

Important Notice:
Please note that all registration applications are subject to review by the organizing committee. This email confirms that your details and payment records have been received; it does not constitute final event acceptance or payment verification until approved.

Submitted Application Summary:
- Full Name: ${data.fullName || ""}
- Email: ${data.email || ""}
- Mobile: ${data.mobile || ""}
- Status: ${data.status || ""}
- University / Organization: ${data.university || data.organization || "Not specified"}
- Attendance Days: ${Array.isArray(data.attendance) ? data.attendance.join(", ") : (data.attendance || "Not selected")}
- Transportation: ${data.transport || "No transport"}${data.pickupLocation ? " (" + data.pickupLocation + ")" : ""}
- Total Fee: ${data.totalFee || "200"} EGP
- Referral Sources: ${Array.isArray(data.referralSources) ? data.referralSources.join(", ") : (data.referralSources || "None selected")}${data.ambassadorCode ? "\n- Ambassador Code: " + data.ambassadorCode : ""}

*For privacy and security, sensitive identification numbers, payment transaction references, and uploaded document attachments are not displayed in email communications.

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
  const logoBaseUrl = CONFIG.LOGO_BASE_URL;
  const fullName = escapeHtml(data.fullName || "Applicant");
  const email = escapeHtml(data.email || "");
  const mobile = escapeHtml(data.mobile || "");
  const status = escapeHtml(data.status || "");
  const universityOrOrg = escapeHtml(
    data.university === "Other"
      ? (data.universityOther || "Other")
      : (data.university || data.organization || "Not specified")
  );
  const department = escapeHtml(
    data.status === "Student"
      ? (data.studentDepartment === "Other" ? data.studentDepartmentOther : data.studentDepartment)
      : (data.graduateDepartment === "Other" ? data.graduateDepartmentOther : data.graduateDepartment) || "Not specified"
  );
  const attendanceList = Array.isArray(data.attendance) ? data.attendance.map(escapeHtml).join(", ") : escapeHtml(data.attendance || "Not selected");
  const transport = escapeHtml(data.transport || "No transport");
  const pickup = data.transport && data.transport.includes("Other") && data.pickupLocation
    ? ` (${escapeHtml(data.pickupLocation)})`
    : "";
  const totalFee = escapeHtml(data.totalFee || "200");
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
                  Please note that all registration applications are subject to review by the organizing committee. This email confirms that your details and payment records have been received; it does not constitute final event acceptance or payment verification until approved.
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
              <tr><td style="color: #5A6E82;"><strong>Transportation:</strong></td><td>${transport}${pickup}</td></tr>
              <tr><td style="color: #5A6E82;"><strong>Total Registration Fee:</strong></td><td style="color: #0B6623; font-weight: 700;">${totalFee} EGP</td></tr>
              <tr><td style="color: #5A6E82;"><strong>Referral Sources:</strong></td><td>${referralSources}</td></tr>
              ${ambassadorCode ? `<tr><td style="color: #5A6E82;"><strong>Ambassador Code:</strong></td><td style="color: #00629B; font-weight: 600;">${ambassadorCode}</td></tr>` : ""}
            </table>
            <p style="margin: 12px 0 0; font-size: 11px; color: #8A9CAE; font-style: italic;">
              *For your privacy and security, sensitive identification numbers, payment transaction references, and uploaded document attachments are not displayed in email communications.
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
  const logoIds = CONFIG.LOGO_FILE_IDS;

  Object.keys(logoIds).forEach(function (key) {
    try {
      const file = DriveApp.getFileById(logoIds[key]);
      const blob = file.getBlob();

      if (!blob.getContentType().startsWith("image/")) {
        throw new Error("The Drive file is not an image: " + key);
      }

      logos[key] = blob.setName(key + ".png");
    } catch (err) {
      Logger.log(
        "Logo loading failed (" + key + "): " + err.toString()
      );
    }
  });

  return logos;
}


function testLogoAccess() {
  const logoIds = CONFIG.LOGO_FILE_IDS;
  const results = [];

  Object.keys(logoIds).forEach(function (key) {
    try {
      const file = DriveApp.getFileById(logoIds[key]);
      const blob = file.getBlob();

      results.push({
        logo: key,
        status: "OK",
        fileName: file.getName(),
        contentType: blob.getContentType(),
        sizeBytes: blob.getBytes().length
      });
    } catch (err) {
      results.push({
        logo: key,
        status: "FAILED",
        error: err.toString()
      });
    }
  });

  Logger.log(JSON.stringify(results, null, 2));
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
    transport: "No",
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

