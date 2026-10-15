/**
 * HTML Email Template Generator for Sensors Summit 2026 Registration
 * 
 * Compliant with major email clients (Gmail, Outlook, Apple Mail):
 * - Table-based responsive layout with inline styles
 * - Strict HTML entity escaping for user input
 * - Strictly excludes sensitive personal data (national ID, payment references, file URLs)
 * - Uses official IEEE Sensors Summit 2026 palette:
 *   Deep Navy (#002855), IEEE Blue (#00629B), Process Cyan (#00B5E2), IEEE Orange (#E87722)
 */

export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateRegistrationEmailHtml(data = {}, options = {}) {
  const logoBaseUrl = options.logoBaseUrl || "https://raw.githubusercontent.com/AmrNabihRiyad/sensor-summit-2026-registration/main/src/assets/logos";

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
  
  const attendanceList = Array.isArray(data.attendance)
    ? data.attendance.map(escapeHtml).join(", ")
    : escapeHtml(data.attendance || "Not selected");

  const rawTransport = data.transport || "No transport";
  const hasTransport = rawTransport && rawTransport !== "No transport";
  const pickup = rawTransport && rawTransport.includes("Other") && data.pickupLocation
    ? ` (${escapeHtml(data.pickupLocation)})`
    : "";

  let transportDisplay = "";
  let transportFeeDisplay = "";
  if (isGuest) {
    if (hasTransport) {
      transportDisplay = `${escapeHtml(rawTransport)}${pickup} (Complimentary)`;
      transportFeeDisplay = "0 EGP (Complimentary)";
    } else {
      transportDisplay = "No transport";
      transportFeeDisplay = "0 EGP";
    }
  } else {
    if (hasTransport) {
      transportDisplay = `${escapeHtml(rawTransport)}${pickup}`;
      transportFeeDisplay = "100 EGP";
    } else {
      transportDisplay = "No transport";
      transportFeeDisplay = "0 EGP";
    }
  }

  const totalFeeVal = isGuest ? "0" : (data.totalFee !== undefined && data.totalFee !== null ? String(data.totalFee) : "200");
  const totalFeeDisplay = isGuest || totalFeeVal === "0" ? "0 EGP (Free Registration)" : `${escapeHtml(totalFeeVal)} EGP`;
  const registrationId = data.registrationId ? escapeHtml(data.registrationId) : null;
  const referralSources = Array.isArray(data.referralSources)
    ? data.referralSources.map(escapeHtml).join(", ")
    : escapeHtml(data.referralSources || (data.ambassadorReferral === "Yes" ? "Through an Ambassador" : (data.ambassadorReferral || "None selected")));
  const hasAmbassador = Array.isArray(data.referralSources)
    ? data.referralSources.includes("Through an Ambassador")
    : (String(data.referralSources || "").includes("Through an Ambassador") || data.ambassadorReferral === "Yes");
  const ambassadorCode = hasAmbassador && data.ambassadorCode
    ? escapeHtml(data.ambassadorCode)
    : null;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Sensors Summit 2026 - Registration Received</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F7FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #2D3E50;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F7FA; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background-color: #FFFFFF; border-radius: 10px; overflow: hidden; border: 1px solid #D1DCE5; box-shadow: 0 4px 16px rgba(0, 40, 85, 0.06);">
          
          <!-- Header (Pure White Background) -->
          <tr>
            <td align="center" style="background-color: #FFFFFF; padding: 32px 24px 24px; border-bottom: 2px solid #00B5E2;">
              <img src="${logoBaseUrl}/sensors-summit.png" alt="Sensors Summit 2026 Logo" width="220" style="display: block; width: 220px; max-width: 100%; height: auto; border: 0;" />
              <p style="margin: 12px 0 0; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #00629B; font-family: 'Courier New', Courier, monospace;">
                IEEE Sensors Council Egypt Chapter
              </p>
            </td>
          </tr>

          <!-- Hero Greeting Banner -->
          <tr>
            <td style="background-color: #002855; padding: 28px 32px; color: #FFFFFF; text-align: left;">
              <span style="display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #00B5E2; font-family: 'Courier New', Courier, monospace; margin-bottom: 6px;">
                Application Received
              </span>
              <h1 style="margin: 0 0 10px; font-size: 22px; font-weight: 700; color: #FFFFFF; line-height: 1.25;">
                Thank You, ${fullName}!
              </h1>
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #E1EDF7;">
                Your registration application for <strong>Sensors Summit 2026</strong> has been received by the organizing team.
              </p>
              ${registrationId ? `
              <div style="margin-top: 14px; padding: 8px 14px; background-color: rgba(0, 181, 226, 0.15); border-left: 3px solid #00B5E2; border-radius: 4px; font-size: 13px; color: #FFFFFF; font-family: 'Courier New', Courier, monospace;">
                <strong>Registration Reference ID:</strong> ${registrationId}
              </div>
              ` : ""}
            </td>
          </tr>

          <!-- Application Review Notice Box -->
          <tr>
            <td style="padding: 24px 32px 0;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #EBF5FB; border-left: 4px solid #00629B; border-radius: 6px; padding: 14px 18px;">
                <tr>
                  <td>
                    <strong style="color: #002855; font-size: 14px; display: block; margin-bottom: 4px;">Application Under Review</strong>
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #2D3E50;">
                      ${isGuest || totalFeeVal === "0"
                        ? "Please note that all registration applications are subject to review by the organizing committee. This email confirms that your registration details have been received; it does not constitute final event acceptance until approved. You will receive a follow-up email once the review is completed."
                        : "Please note that all registration applications are subject to review by the organizing committee. This email confirms that your details and payment records have been received; it does not constitute final event acceptance or payment verification until approved. You will receive a follow-up email once the review is completed."}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Submitted Information Summary Table -->
          <tr>
            <td style="padding: 24px 32px;">
              <h2 style="margin: 0 0 14px; font-size: 16px; font-weight: 700; color: #002855; border-bottom: 1px solid #E2ECF4; padding-bottom: 8px;">
                Submitted Application Summary
              </h2>
              <table border="0" cellpadding="6" cellspacing="0" width="100%" style="font-size: 13px; color: #2D3E50;">
                <tr style="border-bottom: 1px solid #F4F7FA;">
                  <td width="38%" style="color: #5A6E82; padding: 6px 0;"><strong>Full Name:</strong></td>
                  <td style="padding: 6px 0;">${fullName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #F4F7FA;">
                  <td style="color: #5A6E82; padding: 6px 0;"><strong>Email Address:</strong></td>
                  <td style="padding: 6px 0;">${email}</td>
                </tr>
                <tr style="border-bottom: 1px solid #F4F7FA;">
                  <td style="color: #5A6E82; padding: 6px 0;"><strong>Mobile Number:</strong></td>
                  <td style="padding: 6px 0;">${mobile}</td>
                </tr>
                <tr style="border-bottom: 1px solid #F4F7FA;">
                  <td style="color: #5A6E82; padding: 6px 0;"><strong>Status &amp; Affiliation:</strong></td>
                  <td style="padding: 6px 0;">${status} &middot; ${universityOrOrg} (${department})</td>
                </tr>
                <tr style="border-bottom: 1px solid #F4F7FA;">
                  <td style="color: #5A6E82; padding: 6px 0;"><strong>Attendance Days:</strong></td>
                  <td style="padding: 6px 0;">${attendanceList}</td>
                </tr>
                <tr style="border-bottom: 1px solid #F4F7FA;">
                  <td style="color: #5A6E82; padding: 6px 0;"><strong>Transportation:</strong></td>
                  <td style="padding: 6px 0;">${transportDisplay}</td>
                </tr>
                <tr style="border-bottom: 1px solid #F4F7FA;">
                  <td style="color: #5A6E82; padding: 6px 0;"><strong>Transportation Fee:</strong></td>
                  <td style="padding: 6px 0;">${transportFeeDisplay}</td>
                </tr>
                <tr style="border-bottom: 1px solid #F4F7FA;">
                  <td style="color: #5A6E82; padding: 6px 0;"><strong>Total Registration Fee:</strong></td>
                  <td style="padding: 6px 0; color: #0B6623; font-weight: 700;">${totalFeeDisplay}</td>
                </tr>
                <tr style="border-bottom: 1px solid #F4F7FA;">
                  <td style="color: #5A6E82; padding: 6px 0;"><strong>Referral Sources:</strong></td>
                  <td style="padding: 6px 0;">${referralSources}</td>
                </tr>
                ${ambassadorCode ? `
                <tr>
                  <td style="color: #5A6E82; padding: 6px 0;"><strong>Ambassador Code:</strong></td>
                  <td style="padding: 6px 0; color: #00629B; font-weight: 600;">${ambassadorCode}</td>
                </tr>
                ` : ""}
              </table>
              <p style="margin: 12px 0 0; font-size: 11px; color: #8A9CAE; font-style: italic;">
                ${isGuest || totalFeeVal === "0"
                  ? "*For your privacy and security, sensitive identification numbers and uploaded document attachments are not displayed in email communications."
                  : "*For your privacy and security, sensitive identification numbers, payment transaction references, and uploaded document attachments are not displayed in email communications."}
              </p>
            </td>
          </tr>

          <!-- Event Details Card -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #D1DCE5; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 700; color: #00629B; text-transform: uppercase; font-family: 'Courier New', Courier, monospace;">
                      Event Details
                    </span>
                    <h3 style="margin: 4px 0 10px; font-size: 17px; color: #002855;">
                      Sensors Summit 2026: Digital Twin in Biosensing Applications
                    </h3>
                    <p style="margin: 0 0 6px; font-size: 13px; color: #2D3E50;">
                      <strong>Dates:</strong> November 12 (Day 1 Talks &amp; Keynotes) &middot; November 14 (Day 2 Workshop)
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #2D3E50;">
                      <strong>Venue:</strong>
                      <a href="https://maps.app.goo.gl/BhbY8ptNSHnDszbR6" target="_blank" style="color: #00629B; text-decoration: underline; font-weight: 600;">
                        The British University in Egypt (BUE), El Sherouk City, Cairo ↗
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Official Contact Information -->
          <tr>
            <td style="padding: 0 32px 28px; border-bottom: 1px solid #E2ECF4;">
              <h3 style="margin: 0 0 8px; font-size: 14px; color: #002855;">Need Assistance?</h3>
              <p style="margin: 0 0 6px; font-size: 13px; color: #5A6E82;">
                ${isGuest || totalFeeVal === "0"
                  ? "If you have questions regarding your application status or attendance arrangements, please contact the designated event coordinator:"
                  : "If you have questions regarding your application status, payment verification, or attendance arrangements, please contact the designated event coordinator:"}
              </p>
              <p style="margin: 0; font-size: 13px; color: #2D3E50;">
                <strong>Eng. Amr Nabih</strong> &middot;
                <a href="mailto:Amr_Nabih@ieee.org" style="color: #00629B; text-decoration: underline;">Amr_Nabih@ieee.org</a> &middot;
                <a href="tel:+201212551698" style="color: #00629B; text-decoration: underline;">+20 121 255 1698</a>
              </p>
            </td>
          </tr>

          <!-- Footer - Official Logos & Partners (Pure White Background, Table-based) -->
          <tr>
            <td align="center" style="background-color: #FFFFFF; padding: 28px 24px 20px;">
              <p style="margin: 0 0 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #5A6E82; font-family: 'Courier New', Courier, monospace;">
                Organized By &middot; Hosted At &middot; Supported By
              </p>
              
              <!-- Organizing Chapter, Host, Sponsor -->
              <table border="0" cellpadding="6" cellspacing="0" style="margin-bottom: 16px;">
                <tr>
                  <td align="center" style="padding: 6px 12px;">
                    <img src="${logoBaseUrl}/Egypt%20Chapter%20Logo%20-%20Original.png" alt="IEEE Sensors Council Egypt Chapter Logo" height="42" style="display: block; height: 42px; width: auto; border: 0;" />
                  </td>
                  <td align="center" style="padding: 6px 12px;">
                    <img src="${logoBaseUrl}/BUE-Logo.png" alt="The British University in Egypt Logo - Host Venue" height="42" style="display: block; height: 42px; width: auto; border: 0;" />
                  </td>
                  <td align="center" style="padding: 6px 12px;">
                    <img src="${logoBaseUrl}/IEEE%20Women%20in%20Sensors%20Logo%20RGB.png" alt="IEEE Women in Sensors Logo - Main Sponsor" height="42" style="display: block; height: 42px; width: auto; border: 0;" />
                  </td>
                </tr>
              </table>

              <!-- Partners Group -->
              <table border="0" cellpadding="6" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 4px 8px;">
                    <img src="${logoBaseUrl}/FABLAB-Logo.png" alt="FabLab Egypt Logo" height="30" style="display: block; height: 30px; width: auto; border: 0;" />
                  </td>
                  <td align="center" style="padding: 4px 8px;">
                    <img src="${logoBaseUrl}/ELEC_Logo.png" alt="ELEC Logo" height="30" style="display: block; height: 30px; width: auto; border: 0;" />
                  </td>
                  <td align="center" style="padding: 4px 8px;">
                    <img src="${logoBaseUrl}/ASIS-Logo.png" alt="ASIS Logo" height="30" style="display: block; height: 30px; width: auto; border: 0;" />
                  </td>
                  <td align="center" style="padding: 4px 8px;">
                    <img src="${logoBaseUrl}/DAAD-Logo.png" alt="DAAD Egypt Logo" height="30" style="display: block; height: 30px; width: auto; border: 0;" />
                  </td>
                  <td align="center" style="padding: 4px 8px;">
                    <img src="${logoBaseUrl}/IEEE%20Sensors%20Council%20Logo.png" alt="IEEE Sensors Council Logo" height="30" style="display: block; height: 30px; width: auto; border: 0;" />
                  </td>
                </tr>
              </table>

              <!-- Connect with IEEE Sensors Council Egypt Chapter -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 20px auto 10px; text-align: center;">
                <tr>
                  <td align="center" style="font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #00629B; font-family: 'Courier New', Courier, monospace; padding-bottom: 8px;">
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
      </td>
    </tr>
  </table>
</body>
</html>`;
}
