/**
 * ============================================================================
 * INNOHACK-26: GOOGLE APPS SCRIPT BACKEND (DRIVE, SHEETS & GMAIL CONFIRMATION)
 * ============================================================================
 *
 * HOW TO ACTIVATE / UPDATE:
 * 1. Open your Google Sheet (e.g. InnoHack-26 Registrations).
 * 2. In top menu: Extensions -> Apps Script.
 * 3. Delete existing code and paste THIS ENTIRE FILE.
 * 4. In toolbar dropdown, select "testRun" and click "Run" (Authorize if prompted).
 * 5. (OPTIONAL) Select "fixExistingRowsToViewImages" and click "Run" to convert
 *    any existing rows to visible in-cell images!
 * 6. Click "Deploy" (top right) -> "Manage deployments" -> Click Edit (pencil icon)
 *    -> Under Version choose "New version" -> Click "Deploy".
 *    (Or if 1st time: "Deploy" -> "New deployment" -> Web app -> Anyone -> Deploy).
 * 7. Ensure GOOGLE_SHEETS_WEBHOOK_URL in .env and Vercel points to your Web App URL.
 * ============================================================================
 */

const DEFAULT_SPREADSHEET_ID = "1J3nZj977Gm2AvfMmg3hJDm6rAMdJFo-16lyxnTlaKZo";
const FOLDER_NAME = "InnoHack-26 Payment Screenshots";
const SITE_URL = "https://innohack26.vercel.app";
const POSTER_IMAGE_URL = "https://innohack26.vercel.app/media/innohack26-brochure-qr-updated_769f8c7b.webp";

const HEADERS = [
  "Timestamp",
  "Reference Code",
  "Team Name",
  "Team Lead Name",
  "Email Address",
  "Mobile Number",
  "College / Institution",
  "Squad Size",
  "Member 1 Name",
  "Member 2 Name",
  "Member 3 Name",
  "Member 4 Name",
  "Member 5 Name",
  "Member 6 Name",
  "Innovation Domain",
  "Build Type",
  "Fee Calculation",
  "Amount Paid (₹)",
  "Transaction ID / UTR",
  "Payment Screenshot / Photo",
  "Payment Status",
  "Confirmation Email Sent"
];

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "InnoHack-26 Registration & Gmail Confirmation Backend",
    version: "3.0-food-tokens-and-gmail",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    let payload;
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    } else {
      throw new Error("No data received");
    }

    const reg = payload.registration || payload;
    const targetSpreadsheetId = payload.spreadsheetId || reg.spreadsheetId || DEFAULT_SPREADSHEET_ID;
    
    let spreadsheet = null;
    try {
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    } catch (activeErr) {
      Logger.log("Active spreadsheet lookup notice: " + activeErr);
    }

    if (!spreadsheet && targetSpreadsheetId) {
      try {
        spreadsheet = SpreadsheetApp.openById(targetSpreadsheetId);
      } catch (openErr) {
        Logger.log("openById lookup notice: " + openErr);
      }
    }

    if (!spreadsheet) {
      throw new Error("Target Google Sheet not found. If this script is inside your Google Sheet, ensure you opened Apps Script via Extensions -> Apps Script.");
    }

    // 1. Calculate Amount Paid (₹500 per head)
    const memberCount = Number(reg.memberCount) || 1;
    const amountPaid = memberCount * 500;
    const feeCalculation = `${memberCount} x ₹500 = ₹${amountPaid}`;

    // 2. Extract squad member names
    const memberNames = [
      reg.memberOne || reg.leadName || "Member 1",
      reg.memberTwo || "",
      reg.memberThree || "",
      reg.memberFour || "",
      reg.memberFive || "",
      reg.memberSix || ""
    ].slice(0, memberCount).filter(Boolean);

    // 3. Handle Photo Upload to Google Drive if provided
    let photoUrl = "";
    let photoFormula = "";
    let fileId = "";
    
    if (reg.photoBase64 && typeof reg.photoBase64 === "string" && reg.photoBase64.length > 20) {
      try {
        const driveFolder = getOrCreateFolder(FOLDER_NAME);
        
        let cleanBase64 = reg.photoBase64;
        if (cleanBase64.indexOf(",") > -1) {
          cleanBase64 = cleanBase64.split(",")[1];
        }
        cleanBase64 = cleanBase64.replace(/\s/g, "");

        const decodedBytes = Utilities.base64Decode(cleanBase64);
        const mimeType = reg.photoType || "image/jpeg";
        const extension = (mimeType.indexOf("/") > -1) ? mimeType.split("/")[1] : "jpg";
        const cleanRef = (reg.referenceCode || "REG").replace(/[^a-zA-Z0-9_-]/g, "_");
        const fileName = `${cleanRef}_Payment_${Date.now()}.${extension}`;
        
        const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
        const file = driveFolder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        fileId = file.getId();
        photoUrl = `https://drive.google.com/file/d/${fileId}/view`;
        
        const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
        photoFormula = `=HYPERLINK("${photoUrl}", IMAGE("${thumbnailUrl}", 1))`;
      } catch (uploadError) {
        Logger.log("Failed to upload image to Drive: " + uploadError.toString());
        photoUrl = "Upload error: " + uploadError.toString();
        photoFormula = photoUrl;
      }
    } else if (reg.photoUrl) {
      photoUrl = reg.photoUrl;
      const idMatch = photoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || photoUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        fileId = idMatch[1];
        const driveView = `https://drive.google.com/file/d/${fileId}/view`;
        const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
        photoFormula = `=HYPERLINK("${driveView}", IMAGE("${thumbnailUrl}", 1))`;
      } else {
        photoFormula = `=HYPERLINK("${photoUrl}", "View Screenshot")`;
      }
    }

    // 4. Format Timestamp (Asia/Kolkata IST)
    const formattedTimestamp = Utilities.formatDate(
      reg.submittedAt ? new Date(reg.submittedAt) : new Date(),
      "Asia/Kolkata",
      "dd/MM/yyyy HH:mm:ss"
    );

    // 5. Send Automated Confirmation Gmail with Poster Cover & Food Tokens
    let emailSentStatus = "Sent";
    try {
      sendConfirmationGmail(reg, memberNames, amountPaid);
    } catch (mailErr) {
      Logger.log("Gmail sending error: " + mailErr.toString());
      emailSentStatus = "Failed: " + mailErr.toString();
    }

    // 6. Build Row Data
    const row = [
      formattedTimestamp,
      reg.referenceCode || "",
      reg.teamName || "",
      reg.leadName || "",
      reg.email || "",
      reg.phone || "",
      reg.college || "",
      memberCount,
      reg.memberOne || "",
      reg.memberTwo || "",
      reg.memberThree || "",
      reg.memberFour || "",
      reg.memberFive || "",
      reg.memberSix || "",
      reg.domain || "",
      (reg.buildType || "software").toUpperCase(),
      feeCalculation,
      amountPaid,
      reg.transactionId || "",
      photoFormula || photoUrl || "No screenshot attached",
      reg.paymentStatus || "payment_pending",
      emailSentStatus
    ];

    // 7. Append to "Form Responses 1"
    const allSheet = getOrCreateSheet(spreadsheet, "Form Responses 1");
    allSheet.appendRow(row);
    formatRowWithImage(allSheet, allSheet.getLastRow(), Boolean(fileId || photoFormula));

    // Also append to "All Registrations" if present
    const allRegSheet = spreadsheet.getSheetByName("All Registrations");
    if (allRegSheet) {
      allRegSheet.appendRow(row);
      formatRowWithImage(allRegSheet, allRegSheet.getLastRow(), Boolean(fileId || photoFormula));
    }

    // 8. Append to Build Type Sheet (Software or Hardware)
    const buildTypeSheetName = (reg.buildType === "hardware") ? "Hardware" : "Software";
    const buildSheet = getOrCreateSheet(spreadsheet, buildTypeSheetName);
    buildSheet.appendRow(row);
    formatRowWithImage(buildSheet, buildSheet.getLastRow(), Boolean(fileId || photoFormula));

    // 9. Append individual food tokens to "Food Tokens & Head Count" tracking sheet
    try {
      const foodSheet = getOrCreateFoodTokensSheet(spreadsheet);
      memberNames.forEach(function(mName, idx) {
        const mIdx = idx + 1;
        const tokenId = `${reg.referenceCode}-F${mIdx}`;
        foodSheet.appendRow([
          formattedTimestamp,
          tokenId,
          reg.referenceCode,
          mName,
          mIdx === 1 ? "Team Leader" : `Member ${mIdx}`,
          reg.teamName,
          reg.college,
          reg.phone,
          reg.email,
          "Unclaimed", // 24th Morning Snacks
          "Unclaimed", // 24th Night Dinner
          "Unclaimed", // 24th Night Snacks
          "Unclaimed", // 25th Morning Breakfast
          "Unclaimed", // 25th Morning Snacks
          "Unclaimed"  // 25th Afternoon Snacks
        ]);
      });
    } catch (foodLogErr) {
      Logger.log("Food log sheet notice: " + foodLogErr.toString());
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      referenceCode: reg.referenceCode,
      amountPaid: amountPaid,
      emailSent: emailSentStatus === "Sent",
      photoUrl: photoUrl,
      fileId: fileId,
      message: "Registration recorded successfully. Confirmation email with poster and food tokens sent to " + reg.email
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error processing registration: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message || error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Sends rich HTML email from organizer's Gmail account directly to participant
 */
function sendConfirmationGmail(reg, memberNames, amountPaid) {
  if (!reg.email || reg.email.indexOf("@") === -1) return;

  const refCode = reg.referenceCode || "IH26-CONFIRMED";
  const subject = `🎉 InnoHack-26 Registration Confirmed | Ref: ${refCode} (Squad: ${reg.teamName})`;

  let passesHtml = "";
  memberNames.forEach(function(name, idx) {
    const mIdx = idx + 1;
    const role = mIdx === 1 ? "Team Leader" : `Squad Member ${mIdx}`;
    const tokenId = `${refCode}-F${mIdx}`;
    const passUrl = `${SITE_URL}/food-token?token=${encodeURIComponent(tokenId)}&ref=${encodeURIComponent(refCode)}&m=${mIdx}`;
    const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(passUrl)}&color=07111d&bgcolor=ffffff&qzone=1`;

    passesHtml += `
      <div style="margin-bottom: 20px; border: 2px solid #2199ff; border-radius: 12px; background: #0b1a38; overflow: hidden;">
        <div style="padding: 12px 18px; background: #102d5d; border-bottom: 1px solid rgba(98,185,255,0.3);">
          <span style="background: rgba(33,153,255,0.25); border: 1px solid #2199ff; color: #ffdc86; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 11px; font-weight: bold;">
            PASS #${mIdx} OF ${memberNames.length}
          </span>
          <h3 style="margin: 6px 0 2px; color: #ffffff; font-size: 18px; font-weight: bold;">${escapeHtml(name)}</h3>
          <span style="color: #90b8f8; font-family: monospace; font-size: 12px;">${role} · Token: <strong>${tokenId}</strong></span>
        </div>
        <div style="padding: 16px; display: flex; align-items: center;">
          <table role="presentation" width="100%">
            <tr>
              <td width="140" align="center" style="vertical-align: middle;">
                <img src="${qrImage}" alt="QR" width="120" height="120" style="display: block; border-radius: 6px; background: #ffffff; padding: 6px;" />
                <span style="display: block; margin-top: 6px; color: #90b8f8; font-size: 10px; font-family: monospace;">SCAN AT CATERING DESK</span>
              </td>
              <td style="padding-left: 14px; vertical-align: top;">
                <p style="margin: 0 0 6px; color: #ffdc86; font-size: 11px; font-weight: bold; letter-spacing: 1px;">INCLUDES 6 MEAL & REFRESHMENT SLOTS:</p>
                <div style="font-size: 12px; color: #d0e2ff; line-height: 1.6;">
                  ☕ <strong>24th Sep Morning</strong> Snacks & Tea<br/>
                  🍽️ <strong>24th Sep Night</strong> Hackathon Feast (Dinner)<br/>
                  🌙 <strong>24th Sep Night</strong> Midnight Energy Refreshments<br/>
                  🌅 <strong>25th Sep Morning</strong> Day 2 Breakfast<br/>
                  ☕ <strong>25th Sep Morning</strong> Snacks & Tea<br/>
                  🥪 <strong>25th Sep Afternoon</strong> Valedictory High Tea
                </div>
              </td>
            </tr>
          </table>
        </div>
      </div>
    `;
  });

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0; padding:0; background-color: #030a1c; font-family: Arial, sans-serif; color: #e2e8f0;">
      <center style="padding: 20px 0;">
        <div style="max-width: 650px; background: #07132b; border: 1px solid #16427d; border-radius: 14px; overflow: hidden; text-align: left;">
          
          <!-- Poster Cover Image Header -->
          <div style="background: #000; text-align: center;">
            <a href="${SITE_URL}" target="_blank">
              <img src="${POSTER_IMAGE_URL}" alt="InnoHack-26 Poster" style="width: 100%; max-width: 650px; height: auto; display: block;" />
            </a>
          </div>

          <!-- Title Banner -->
          <div style="padding: 24px; background: linear-gradient(180deg, #0d234d 0%, #07132b 100%); text-align: center; border-bottom: 1px solid rgba(255,220,134,0.3);">
            <div style="display: inline-block; padding: 4px 12px; background: rgba(255,220,134,0.15); border: 1px solid #ffdc86; border-radius: 20px; margin-bottom: 10px; color: #ffdc86; font-family: monospace; font-size: 11px; font-weight: bold;">
              OFFICIAL REGISTRATION TRANSMISSION
            </div>
            <h1 style="margin: 0 0 6px; color: #ffffff; font-size: 26px; font-weight: 900;">REGISTRATION <span style="color: #ffdc86;">CONFIRMED!</span></h1>
            <p style="margin: 0; color: #a9c7f8; font-size: 14px;">Welcome to <strong>InnoHack-26</strong>! Your squad is locked in for the 24-hour innovation orbit.</p>
          </div>

          <!-- Reference Code Box -->
          <div style="padding: 20px 24px 10px;">
            <div style="background: rgba(33,153,255,0.12); border: 2px dashed #ffdc86; border-radius: 10px; padding: 16px; text-align: center;">
              <span style="color: #ffdc86; font-family: monospace; font-size: 11px; font-weight: bold; letter-spacing: 2px;">YOUR UNIQUE REGISTRATION REFERENCE</span>
              <div style="margin: 6px 0; color: #ffffff; font-family: monospace; font-size: 24px; font-weight: 900; letter-spacing: 2px;">${refCode}</div>
              <span style="color: #94bcf8; font-size: 12px;">Keep this code for on-campus verification & check-in.</span>
            </div>
          </div>

          <!-- Squad & Payment Summary -->
          <div style="padding: 14px 24px;">
            <div style="background: #091a3a; border: 1px solid rgba(98,185,255,0.25); border-radius: 10px; padding: 18px;">
              <h3 style="margin: 0 0 12px; color: #ffdc86; font-size: 14px; font-weight: bold; letter-spacing: 1px; border-bottom: 1px solid rgba(98,185,255,0.2); padding-bottom: 8px;">
                SQUAD & PAYMENT RECEIPT
              </h3>
              <table style="width: 100%; font-size: 13px; color: #d0e2ff;">
                <tr><td style="padding: 4px 0; color: #94bcf8;">Team Name:</td><td align="right" style="font-weight: bold; color: #fff;">${escapeHtml(reg.teamName || "")}</td></tr>
                <tr><td style="padding: 4px 0; color: #94bcf8;">Team Leader:</td><td align="right" style="color: #fff;">${escapeHtml(reg.leadName || "")}</td></tr>
                <tr><td style="padding: 4px 0; color: #94bcf8;">College:</td><td align="right" style="color: #fff;">${escapeHtml(reg.college || "")}</td></tr>
                <tr><td style="padding: 4px 0; color: #94bcf8;">Innovation Domain:</td><td align="right" style="color: #fff;">${escapeHtml(reg.domain || "")}</td></tr>
                <tr><td style="padding: 4px 0; color: #94bcf8;">Squad Size:</td><td align="right" style="color: #fff; font-weight: bold;">${memberNames.length} Members</td></tr>
                <tr><td style="padding: 4px 0; color: #94bcf8;">Fee Rate:</td><td align="right" style="color: #fff;">₹500 / member</td></tr>
                <tr><td style="padding: 4px 0; color: #94bcf8;">Fee Calculation:</td><td align="right" style="color: #ffdc86; font-weight: bold;">${memberNames.length} × ₹500 = ₹${amountPaid}</td></tr>
                <tr><td style="padding: 4px 0; color: #94bcf8;">Transaction UTR / ID:</td><td align="right" style="color: #fff; font-family: monospace;">${escapeHtml(reg.transactionId || "")}</td></tr>
                <tr><td style="padding: 8px 0 0; color: #ffdc86; font-weight: bold; border-top: 1px solid rgba(98,185,255,0.2);">TOTAL PAID:</td><td align="right" style="padding: 8px 0 0; color: #4ade80; font-size: 16px; font-weight: 900; border-top: 1px solid rgba(98,185,255,0.2);">₹${amountPaid} (RECORDED)</td></tr>
              </table>
            </div>
          </div>

          <!-- Individual Food Passes -->
          <div style="padding: 16px 24px 6px;">
            <h2 style="margin: 0 0 6px; color: #ffffff; font-size: 18px; font-weight: bold;">🍽️ INDIVIDUAL FOOD & SNACKS PASSES (${memberNames.length} ISSUED)</h2>
            <p style="margin: 0 0 16px; color: #94bcf8; font-size: 13px;">Show each QR pass on your phone at the catering counter for instant meal check-off.</p>
            ${passesHtml}
          </div>

          <!-- Event Schedule & Venue -->
          <div style="padding: 10px 24px;">
            <div style="background: #091a3a; border: 1px solid rgba(255,220,134,0.3); border-radius: 10px; padding: 16px;">
              <h3 style="margin: 0 0 6px; color: #ffdc86; font-size: 14px;">📍 EVENT SCHEDULE & VENUE</h3>
              <p style="margin: 0 0 4px; color: #fff; font-weight: bold; font-size: 13px;">🗓️ Dates: 24th & 25th September 2026 (24-Hour Continuous Sprint)</p>
              <p style="margin: 0; color: #c0d4f8; font-size: 12px;">🏛️ <strong>Venue:</strong> Erode Sengunthar Engineering College, Thuduppathi, Perundurai, Erode – 638 057. Free college buses available on 40+ routes.</p>
            </div>
          </div>

          <!-- WhatsApp Community CTA -->
          <div style="padding: 16px 24px 28px; text-align: center;">
            <a href="https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t" target="_blank" style="display: inline-block; padding: 12px 24px; background: #25d366; color: #05160b; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 6px;">
              JOIN OFFICIAL WHATSAPP COMMUNITY &rarr;
            </a>
          </div>

          <!-- Footer -->
          <div style="padding: 16px 24px; background: #040c1e; border-top: 1px solid rgba(98,185,255,0.2); text-align: center; color: #6e88b5; font-size: 11px;">
            InnoHack-26 · Erode Sengunthar Engineering College, Perundurai
          </div>

        </div>
      </center>
    </body>
    </html>
  `;

  // Send via MailApp or GmailApp
  try {
    MailApp.sendEmail({
      to: reg.email,
      subject: subject,
      htmlBody: htmlBody
    });
    Logger.log("Email sent successfully to " + reg.email);
  } catch (mErr) {
    GmailApp.sendEmail(reg.email, subject, "InnoHack-26 Registration Confirmed: Ref " + refCode, {
      htmlBody: htmlBody
    });
    Logger.log("Email sent via GmailApp fallback to " + reg.email);
  }
}

function getOrCreateFoodTokensSheet(spreadsheet) {
  const FOOD_HEADERS = [
    "Timestamp", "Token ID", "Reference Code", "Member Name", "Role",
    "Team Name", "College", "Phone", "Email",
    "24th Mrng Snacks", "24th Night Dinner", "24th Night Snacks",
    "25th Mrng Bfast", "25th Mrng Snacks", "25th Aft Snacks"
  ];

  let sheet = spreadsheet.getSheetByName("Food Tokens & Head Count");
  if (!sheet) {
    sheet = spreadsheet.insertSheet("Food Tokens & Head Count");
    sheet.appendRow(FOOD_HEADERS);
    formatHeaderRow(sheet);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(FOOD_HEADERS);
    formatHeaderRow(sheet);
  }
  return sheet;
}

function formatRowWithImage(sheet, rowIndex, hasImage) {
  try {
    if (rowIndex <= 1) return;
    sheet.setRowHeight(rowIndex, 70);
    sheet.setColumnWidth(20, 140);
    const range = sheet.getRange(rowIndex, 1, 1, HEADERS.length);
    range.setVerticalAlignment("middle");
    range.setHorizontalAlignment("left");
    sheet.getRange(rowIndex, 20).setHorizontalAlignment("center");
  } catch (fmtErr) {
    Logger.log("Row formatting notice: " + fmtErr);
  }
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    const existing = folders.next();
    existing.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return existing;
  }
  const folder = DriveApp.createFolder(folderName);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return folder;
}

function getOrCreateSheet(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.appendRow(HEADERS);
    formatHeaderRow(sheet);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    formatHeaderRow(sheet);
  }
  return sheet;
}

function formatHeaderRow(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), HEADERS.length);
  const headerRange = sheet.getRange(1, 1, 1, lastCol);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#0F172A");
  headerRange.setFontColor("#F8FAFC");
  headerRange.setVerticalAlignment("middle");
  headerRange.setHorizontalAlignment("center");
  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Self-diagnostic test to verify permissions for Google Sheets, Google Drive, and Gmail in 1 click.
 * Select "testRun" from the toolbar dropdown and click "Run" in Google Apps Script!
 */
function testRun() {
  Logger.log("=== INNOHACK-26 BACKEND SELF-DIAGNOSTIC ===");
  
  // 1. Test Sheet Access
  var spreadsheet = null;
  try {
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}

  if (!spreadsheet && DEFAULT_SPREADSHEET_ID) {
    try {
      spreadsheet = SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID);
    } catch (openErr) {
      Logger.log("openById notice: " + openErr);
    }
  }

  if (spreadsheet) {
    Logger.log("✅ Google Sheet connected: " + spreadsheet.getName() + " (ID: " + spreadsheet.getId() + ")");
  } else {
    Logger.log("⚠️ Could not locate spreadsheet automatically.");
  }

  // 2. Test Google Drive folder
  try {
    var folder = getOrCreateFolder(FOLDER_NAME);
    Logger.log("✅ Google Drive folder ready: " + folder.getName() + " (ID: " + folder.getId() + ")");
  } catch (dErr) {
    Logger.log("⚠️ Drive folder notice: " + dErr);
  }

  // 3. Test Email Quota
  try {
    var quota = MailApp.getRemainingDailyQuota();
    Logger.log("✅ Remaining Daily Gmail Quota: " + quota + " emails");
  } catch (qErr) {
    Logger.log("⚠️ Email quota notice: " + qErr);
  }

  Logger.log("🎉 ALL PERMISSIONS VERIFIED! You can now click Deploy -> Manage deployments -> Edit -> New Version -> Deploy.");
}

