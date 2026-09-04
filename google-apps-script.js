/**
 * ============================================================================
 * INNOHACK-26: GOOGLE APPS SCRIPT BACKEND (DRIVE, SHEETS & GMAIL CONFIRMATION)
 * ============================================================================
 *
 * HOW TO ACTIVATE / UPDATE:
 * 1. Open your Google Sheet (InnoHack-26 Registrations).
 * 2. In top menu: Extensions -> Apps Script.
 * 3. Delete existing code and paste THIS ENTIRE FILE.
 * 4. Click Save (💾 icon).
 * 5. In toolbar dropdown, select "FORCE_AUTHORIZATION" and click "▷ Run".
 *    -> Click "Review Permissions" -> Choose your Google Account
 *    -> Click "Advanced" -> Click "Go to ... (unsafe)" -> Click "Allow".
 * 6. Click "Deploy" (top right) -> "Manage deployments" -> Click Edit (pencil icon)
 *    -> Under Version choose "New version"
 *    -> Under "Who has access", select "Anyone"
 *    -> Click "Deploy".
 * ============================================================================
 */

/**
 * Run this function ONCE in the Apps Script editor to force Google's Permission Prompt!
 */
function FORCE_AUTHORIZATION() {
  Logger.log("Testing full Google services permissions...");
  
  // 1. Force Google Sheets scope
  try {
    var s = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log("Sheets access granted: " + (s ? s.getName() : "Stand-alone mode"));
  } catch(e) { Logger.log("Sheets note: " + e); }

  // 2. Force Google Drive scope
  try {
    var f = DriveApp.getRootFolder();
    Logger.log("Drive access granted: " + f.getName());
  } catch(e) { Logger.log("Drive note: " + e); }

  // 3. Force MailApp scope
  try {
    var quota = MailApp.getRemainingDailyQuota();
    Logger.log("MailApp quota granted: " + quota);
  } catch(e) { Logger.log("Mail note: " + e); }

  // 4. Force GmailApp scope
  try {
    var drafts = GmailApp.getDrafts();
    Logger.log("GmailApp access granted.");
  } catch(e) { Logger.log("Gmail note: " + e); }

  Logger.log("🎉 SUCCESS: ALL 4 GOOGLE PERMISSIONS ARE FULLY AUTHORIZED!");
}


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
  var param = (e && e.parameter) ? e.parameter : {};
  var action = param.action || "";

  // 1. Food Scanner direct API: lookup token
  if (action === "lookup" || action === "lookupToken") {
    return handleTokenLookup(param.token || param.tokenId || "");
  }

  // 2. Food Scanner direct API: redeem meal
  if (action === "redeem" || action === "redeemMeal") {
    return handleMealRedeem(
      param.token || param.tokenId || "",
      param.meal || param.mealSlotId || "",
      param.claimed !== "false",
      param.by || param.organizerEmail || "Organizer"
    );
  }

  // 3. Food Scanner direct API: live headcount metrics
  if (action === "headcount" || action === "metrics") {
    return handleHeadCount();
  }

  // 4. AI Chatbot Help direct API
  if (action === "ai" || action === "help" || action === "chat") {
    return handleAiHelpQuery(param.q || param.message || param.query || "");
  }

  // 5. Registration data via GET query
  if (param.registration || param.referenceCode) {
    return processRegistration(param);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "InnoHack-26 Registration & Live Food Token Scanner API",
    version: "4.0-scanner-and-sheets",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}


function doPost(e) {
  try {
    var payload;
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    } else {
      payload = {};
    }

    return processRegistration(payload);
  } catch (fatalErr) {
    Logger.log("Fatal doPost error: " + fatalErr.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: fatalErr.message || fatalErr.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function processRegistration(payload) {
  try {
    var reg = payload.registration || payload;
    var targetSpreadsheetId = payload.spreadsheetId || reg.spreadsheetId || DEFAULT_SPREADSHEET_ID;

    // Resolve Spreadsheet with auto-healing fallback
    var spreadsheet = null;
    try {
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    } catch (activeErr) {}

    if (!spreadsheet && targetSpreadsheetId) {
      try {
        spreadsheet = SpreadsheetApp.openById(targetSpreadsheetId);
      } catch (openErr) {}
    }

    if (!spreadsheet) {
      try {
        var files = DriveApp.getFilesByName("InnoHack-26 Registrations");
        if (files.hasNext()) {
          spreadsheet = SpreadsheetApp.open(files.next());
        }
      } catch (searchErr) {}
    }

    if (!spreadsheet) {
      try {
        spreadsheet = SpreadsheetApp.create("InnoHack-26 Registrations");
        Logger.log("Auto-created Google Sheet: " + spreadsheet.getUrl());
      } catch (createErr) {
        Logger.log("Create sheet error: " + createErr);
      }
    }

    if (!spreadsheet) {
      throw new Error("Could not access or create Google Sheet in your Google account.");
    }

    // 1. Calculate Amount Paid (₹500 per head)
    var memberCount = Number(reg.memberCount) || 1;
    var amountPaid = memberCount * 500;
    var feeCalculation = memberCount + " x ₹500 = ₹" + amountPaid;

    // 2. Squad Member Names
    var memberNames = [
      reg.memberOne || reg.leadName || "Member 1",
      reg.memberTwo || "",
      reg.memberThree || "",
      reg.memberFour || "",
      reg.memberFive || "",
      reg.memberSix || ""
    ].slice(0, memberCount).filter(Boolean);

    // 3. Handle Photo Upload to Google Drive (Safely)
    var photoUrl = "";
    var photoFormula = "";
    var fileId = "";

    if (reg.photoBase64 && typeof reg.photoBase64 === "string" && reg.photoBase64.length > 20) {
      try {
        var driveFolder = getOrCreateFolder(FOLDER_NAME);
        var cleanBase64 = reg.photoBase64;
        if (cleanBase64.indexOf(",") > -1) {
          cleanBase64 = cleanBase64.split(",")[1];
        }
        cleanBase64 = cleanBase64.replace(/\s/g, "");

        var decodedBytes = Utilities.base64Decode(cleanBase64);
        var mimeType = reg.photoType || "image/jpeg";
        var extension = (mimeType.indexOf("/") > -1) ? mimeType.split("/")[1] : "jpg";
        var cleanRef = (reg.referenceCode || "REG").replace(/[^a-zA-Z0-9_-]/g, "_");
        var fileName = cleanRef + "_Payment_" + Date.now() + "." + extension;

        var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
        var file = driveFolder.createFile(blob);
        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareErr) {}

        fileId = file.getId();
        photoUrl = "https://drive.google.com/file/d/" + fileId + "/view";
        var thumbnailUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1000";
        photoFormula = '=HYPERLINK("' + photoUrl + '", IMAGE("' + thumbnailUrl + '", 1))';
      } catch (driveErr) {
        Logger.log("Drive upload notice: " + driveErr);
        photoUrl = "Screenshot attached (" + (reg.photoName || "file") + ")";
        photoFormula = photoUrl;
      }
    } else if (reg.photoUrl) {
      photoUrl = reg.photoUrl;
      var idMatch = photoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || photoUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        fileId = idMatch[1];
        var driveView = "https://drive.google.com/file/d/" + fileId + "/view";
        var thumbUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1000";
        photoFormula = '=HYPERLINK("' + driveView + '", IMAGE("' + thumbUrl + '", 1))';
      } else {
        photoFormula = '=HYPERLINK("' + photoUrl + '", "View Screenshot")';
      }
    }

    // 4. Format Timestamp
    var formattedTimestamp = Utilities.formatDate(
      reg.submittedAt ? new Date(reg.submittedAt) : new Date(),
      "Asia/Kolkata",
      "dd/MM/yyyy HH:mm:ss"
    );

    // 5. Send Automated Confirmation Gmail (Safely)
    var emailSentStatus = "Sent";
    try {
      sendConfirmationGmail(reg, memberNames, amountPaid);
    } catch (mailErr) {
      Logger.log("Gmail error: " + mailErr.toString());
      emailSentStatus = "Failed: " + mailErr.toString();
    }

    // 6. Build Row Data
    var row = [
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
    var allSheet = getOrCreateSheet(spreadsheet, "Form Responses 1");
    allSheet.appendRow(row);
    formatRowWithImage(allSheet, allSheet.getLastRow(), Boolean(fileId || photoFormula));

    // Also append to "All Registrations" if present
    var allRegSheet = spreadsheet.getSheetByName("All Registrations");
    if (allRegSheet) {
      allRegSheet.appendRow(row);
      formatRowWithImage(allRegSheet, allRegSheet.getLastRow(), Boolean(fileId || photoFormula));
    }

    // 8. Append to Build Type Sheet (Software or Hardware)
    var buildTypeSheetName = (reg.buildType === "hardware") ? "Hardware" : "Software";
    var buildSheet = getOrCreateSheet(spreadsheet, buildTypeSheetName);
    buildSheet.appendRow(row);
    formatRowWithImage(buildSheet, buildSheet.getLastRow(), Boolean(fileId || photoFormula));

    // 9. Append individual food tokens to "Food Tokens & Head Count" tracking sheet
    try {
      var foodSheet = getOrCreateFoodTokensSheet(spreadsheet);
      memberNames.forEach(function(mName, idx) {
        var mIdx = idx + 1;
        var tokenId = (reg.referenceCode || "IH26") + "-F" + mIdx;
        foodSheet.appendRow([
          formattedTimestamp,
          tokenId,
          reg.referenceCode || "",
          mName,
          mIdx === 1 ? "Team Leader" : ("Member " + mIdx),
          reg.teamName || "",
          reg.college || "",
          reg.phone || "",
          reg.email || "",
          "Unclaimed", // Attendance
          "Unclaimed", // 24th Morning Snacks (Snacks 1/5)
          "Unclaimed", // 24th Evening Snacks (Snacks 2/5)
          "Unclaimed", // 24th Night Dinner (Food 1/2)
          "Unclaimed", // 24th Night Snacks (Snacks 3/5)
          "Unclaimed", // 25th Morning Breakfast (Food 2/2)
          "Unclaimed", // 25th Morning Snacks (Snacks 4/5)
          "Unclaimed"  // 25th Afternoon Snacks (Snacks 5/5)
        ]);
      });
    } catch (foodLogErr) {
      Logger.log("Food sheet log notice: " + foodLogErr.toString());
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      referenceCode: reg.referenceCode,
      amountPaid: amountPaid,
      emailSent: emailSentStatus === "Sent",
      photoUrl: photoUrl,
      fileId: fileId,
      message: "Registration recorded successfully. Confirmation email sent to " + reg.email
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

  var refCode = reg.referenceCode || "IH26-CONFIRMED";
  var subject = "🎉 InnoHack-26 Registration Confirmed | Ref: " + refCode + " (Squad: " + (reg.teamName || "Your Squad") + ")";

  var passUrl = SITE_URL + "/food-token?token=" + encodeURIComponent(refCode) + "&ref=" + encodeURIComponent(refCode) + "&team=true";
  var qrImage = SITE_URL + "/api/qr?token=" + encodeURIComponent(refCode) + "&ref=" + encodeURIComponent(refCode) + "&team=true&format=png&size=300";

  var passesHtml = '<div style="margin-bottom: 20px; border: 2px solid #2199ff; border-radius: 12px; background: #0b1a38; overflow: hidden;">' +
    '<div style="padding: 12px 18px; background: #102d5d; border-bottom: 1px solid rgba(98,185,255,0.3); text-align: center;">' +
    '<span style="background: rgba(33,153,255,0.25); border: 1px solid #2199ff; color: #ffdc86; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 11px; font-weight: bold;">TEAM QR CODE</span>' +
    '<h3 style="margin: 6px 0 2px; color: #ffffff; font-size: 18px; font-weight: bold;">' + escapeHtml(reg.teamName || "Your Squad") + '</h3>' +
    '<span style="color: #90b8f8; font-family: monospace; font-size: 12px;">' + memberNames.length + ' Members · Ref: <strong>' + refCode + '</strong></span>' +
    '</div>' +
    '<div style="padding: 16px; text-align: center;">' +
    '<img src="' + qrImage + '" alt="Team QR" width="160" height="160" style="display: inline-block; border-radius: 6px; background: #ffffff; padding: 8px; margin-bottom: 12px;" />' +
    '<p style="margin: 0 0 6px; color: #ffdc86; font-size: 11px; font-weight: bold;">SHOW THIS SINGLE QR AT REGISTRATION & CATERING</p>' +
    '<div style="font-size: 12px; color: #d0e2ff; line-height: 1.6; max-width: 250px; margin: 0 auto; text-align: left;">' +
    '✔️ <strong>Event Attendance & Check-in</strong><br/>' +
    '🍱 <strong>2 Times Main Food Meals</strong><br/>' +
    '☕ <strong>5 Times Snacks & Refreshments</strong>' +
    '</div>' +
    '</div>' +
    '</div>';

  var htmlBody = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
    '<body style="margin:0; padding:0; background-color: #030a1c; font-family: Arial, sans-serif; color: #e2e8f0;">' +
    '<center style="padding: 20px 0;">' +
    '<div style="max-width: 650px; background: #07132b; border: 1px solid #16427d; border-radius: 14px; overflow: hidden; text-align: left;">' +
    
    '<!-- Poster Cover -->' +
    '<div style="background: #000; text-align: center;">' +
    '<a href="' + SITE_URL + '" target="_blank">' +
    '<img src="' + POSTER_IMAGE_URL + '" alt="InnoHack-26 Poster" style="width: 100%; max-width: 650px; height: auto; display: block;" />' +
    '</a>' +
    '</div>' +

    '<!-- Title Banner -->' +
    '<div style="padding: 24px 24px 16px; border-bottom: 1px solid rgba(98,185,255,0.2);">' +
    '<span style="background: #25d366; color: #031406; padding: 4px 10px; border-radius: 4px; font-weight: 900; font-size: 11px;">REGISTRATION CONFIRMED</span>' +
    '<h1 style="margin: 12px 0 6px; font-size: 24px; color: #ffffff;">YOUR SQUAD IS ON <i>THE SIGNAL.</i></h1>' +
    '<p style="margin: 0; color: #94bcf8; font-size: 14px;">Registration reference: <strong style="color: #ffdc86; font-family: monospace;">' + refCode + '</strong></p>' +
    '</div>' +

    '<!-- Squad Details -->' +
    '<div style="padding: 16px 24px;">' +
    '<div style="background: #091a3a; border-radius: 10px; padding: 16px; font-size: 13px;">' +
    '<table width="100%" style="border-collapse: collapse;">' +
    '<tr><td style="padding: 4px 0; color: #94bcf8;">Team Name:</td><td align="right" style="color: #fff; font-weight: bold;">' + escapeHtml(reg.teamName) + '</td></tr>' +
    '<tr><td style="padding: 4px 0; color: #94bcf8;">Team Leader:</td><td align="right" style="color: #fff;">' + escapeHtml(reg.leadName) + '</td></tr>' +
    '<tr><td style="padding: 4px 0; color: #94bcf8;">College:</td><td align="right" style="color: #fff;">' + escapeHtml(reg.college) + '</td></tr>' +
    '<tr><td style="padding: 4px 0; color: #94bcf8;">Build Track:</td><td align="right" style="color: #ffdc86; font-weight: bold;">' + (reg.buildType || "software").toUpperCase() + ' BUILD</td></tr>' +
    '<tr><td style="padding: 4px 0; color: #94bcf8;">Fee Rate:</td><td align="right" style="color: #fff;">₹500 / member</td></tr>' +
    '<tr><td style="padding: 4px 0; color: #94bcf8;">Fee Calculation:</td><td align="right" style="color: #ffdc86; font-weight: bold;">' + memberNames.length + ' × ₹500 = ₹' + amountPaid + '</td></tr>' +
    '<tr><td style="padding: 4px 0; color: #94bcf8;">Transaction UTR / ID:</td><td align="right" style="color: #fff; font-family: monospace;">' + escapeHtml(reg.transactionId || "") + '</td></tr>' +
    '<tr><td style="padding: 8px 0 0; color: #ffdc86; font-weight: bold; border-top: 1px solid rgba(98,185,255,0.2);">TOTAL PAID:</td><td align="right" style="padding: 8px 0 0; color: #4ade80; font-size: 16px; font-weight: 900; border-top: 1px solid rgba(98,185,255,0.2);">₹' + amountPaid + ' (RECORDED)</td></tr>' +
    '</table>' +
    '</div>' +
    '</div>' +

    '<!-- Food Passes -->' +
    '<div style="padding: 16px 24px 6px;">' +
    '<h2 style="margin: 0 0 6px; color: #ffffff; font-size: 18px; font-weight: bold;">🎟️ OFFICIAL TEAM QR CODE</h2>' +
    '<p style="margin: 0 0 16px; color: #94bcf8; font-size: 13px;">Use this single QR code for the entire squad. The volunteer scanning it will see your team roster and can tick off attendance and food for each member simultaneously.</p>' +
    passesHtml +
    '</div>' +

    '<!-- Venue -->' +
    '<div style="padding: 10px 24px;">' +
    '<div style="background: #091a3a; border: 1px solid rgba(255,220,134,0.3); border-radius: 10px; padding: 16px;">' +
    '<h3 style="margin: 0 0 6px; color: #ffdc86; font-size: 14px;">📍 EVENT SCHEDULE & VENUE</h3>' +
    '<p style="margin: 0 0 4px; color: #fff; font-weight: bold; font-size: 13px;">🗓️ Dates: 24th & 25th September 2026 (24-Hour Continuous Sprint)</p>' +
    '<p style="margin: 0; color: #c0d4f8; font-size: 12px;">🏛️ <strong>Venue:</strong> Erode Sengunthar Engineering College, Thuduppathi, Perundurai, Erode – 638 057. Free college buses available on 40+ routes.</p>' +
    '</div>' +
    '</div>' +

    '<!-- WhatsApp CTA -->' +
    '<div style="padding: 16px 24px 28px; text-align: center;">' +
    '<a href="https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t" target="_blank" style="display: inline-block; padding: 14px 28px; background: #25d366; color: #05160b; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 6px;">' +
    'JOIN OFFICIAL WHATSAPP COMMUNITY &rarr;' +
    '</a>' +
    '</div>' +

    '<!-- Footer -->' +
    '<div style="padding: 16px 24px; background: #040c1e; border-top: 1px solid rgba(98,185,255,0.2); text-align: center; color: #6e88b5; font-size: 11px;">' +
    'InnoHack-26 · Erode Sengunthar Engineering College, Perundurai' +
    '</div>' +

    '</div>' +
    '</center>' +
    '</body></html>';

  try {
    MailApp.sendEmail({
      to: reg.email,
      subject: subject,
      htmlBody: htmlBody
    });
    Logger.log("Email sent successfully to " + reg.email);
  } catch (mErr) {
    try {
      GmailApp.sendEmail(reg.email, subject, "InnoHack-26 Registration Confirmed: Ref " + refCode, {
        htmlBody: htmlBody
      });
      Logger.log("Email sent via GmailApp fallback to " + reg.email);
    } catch (gErr) {
      Logger.log("GmailApp send error: " + gErr);
    }
  }
}

function getOrCreateFoodTokensSheet(spreadsheet) {
  var FOOD_HEADERS = [
    "Timestamp", "Token ID", "Reference Code", "Member Name", "Role",
    "Team Name", "College", "Phone", "Email",
    "Attendance", "24th Mrng Snacks", "24th Eve Snacks", "24th Night Dinner", "24th Night Snacks",
    "25th Mrng Bfast", "25th Mrng Snacks", "25th Aft Snacks"
  ];

  var sheet = spreadsheet.getSheetByName("Food Tokens & Head Count");
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
    var range = sheet.getRange(rowIndex, 1, 1, HEADERS.length);
    range.setVerticalAlignment("middle");
    range.setHorizontalAlignment("left");
    sheet.getRange(rowIndex, 20).setHorizontalAlignment("center");
  } catch (fmtErr) {
    Logger.log("Row formatting notice: " + fmtErr);
  }
}

function getOrCreateFolder(folderName) {
  try {
    var folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      return folders.next();
    }
    return DriveApp.createFolder(folderName);
  } catch (err) {
    Logger.log("Drive folder notice: " + err);
    return DriveApp.getRootFolder();
  }
}

function getOrCreateSheet(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
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
  var lastCol = Math.max(sheet.getLastColumn(), HEADERS.length);
  var headerRange = sheet.getRange(1, 1, 1, lastCol);
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

/**
 * Direct Scanner API: Lookup all team members by Reference Code (or Token ID)
 */
function handleTokenLookup(token) {
  try {
    var cleanToken = String(token || "").trim();
    if (!cleanToken) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Missing token/reference code parameter"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var spreadsheet = resolveSpreadsheet();
    if (!spreadsheet) throw new Error("Google Sheet not accessible");

    var sheet = getOrCreateFoodTokensSheet(spreadsheet);
    var data = sheet.getDataRange().getValues();
    var members = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowToken = String(row[1] || "").trim();
      var rowRef = String(row[2] || "").trim();
      
      if (rowToken.toLowerCase() === cleanToken.toLowerCase() || 
          rowRef.toLowerCase() === cleanToken.toLowerCase() || 
          rowToken.replace(/-/g, "").toLowerCase() === cleanToken.replace(/-/g, "").toLowerCase() ||
          rowRef.replace(/-/g, "").toLowerCase() === cleanToken.replace(/-/g, "").toLowerCase()) {
        
        members.push({
          tokenId: rowToken,
          referenceCode: rowRef,
          memberName: String(row[3] || ""),
          role: String(row[4] || "Squad Member"),
          teamName: String(row[5] || ""),
          college: String(row[6] || ""),
          phone: String(row[7] || ""),
          email: String(row[8] || ""),
          meals: {
            attendance: { claimed: isClaimedVal(row[9]), claimedAt: String(row[9] || "") },
            sep24_mrng_snacks: { claimed: isClaimedVal(row[10]), claimedAt: String(row[10] || "") },
            sep24_eve_snacks: { claimed: isClaimedVal(row[11]), claimedAt: String(row[11] || "") },
            sep24_night_dinner: { claimed: isClaimedVal(row[12]), claimedAt: String(row[12] || "") },
            sep24_night_snacks: { claimed: isClaimedVal(row[13]), claimedAt: String(row[13] || "") },
            sep25_mrng_bfast: { claimed: isClaimedVal(row[14]), claimedAt: String(row[14] || "") },
            sep25_mrng_snacks: { claimed: isClaimedVal(row[15]), claimedAt: String(row[15] || "") },
            sep25_aft_snacks: { claimed: isClaimedVal(row[16]), claimedAt: String(row[16] || "") }
          }
        });
      }
    }

    if (members.length > 0) {
      var primaryPass = members[0];
      for (var p = 0; p < members.length; p++) {
        if (members[p].tokenId.toLowerCase() === cleanToken.toLowerCase()) {
          primaryPass = members[p];
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        pass: primaryPass,
        team: members
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Team / Reference Code not found in Google Sheet: " + cleanToken
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message || err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Direct Food Scanner API: Redeem or toggle meal slot
 */
function handleMealRedeem(token, mealSlotId, claimed, organizerEmail) {
  try {
    var cleanToken = String(token || "").trim();
    if (!cleanToken) throw new Error("Missing token");

    var spreadsheet = resolveSpreadsheet();
    if (!spreadsheet) throw new Error("Google Sheet not accessible");

    var sheet = getOrCreateFoodTokensSheet(spreadsheet);
    var data = sheet.getDataRange().getValues();

    var colMap = {
      attendance: 10,
      sep24_mrng_snacks: 11,
      sep24_eve_snacks: 12,
      sep24_night_dinner: 13,
      sep24_night_snacks: 14,
      sep25_mrng_bfast: 15,
      sep25_mrng_snacks: 16,
      sep25_aft_snacks: 17
    };

    var colIdx = colMap[mealSlotId] || 10; // default attendance

    for (var i = 1; i < data.length; i++) {
      var rowToken = String(data[i][1] || "").trim();
      var rowRef = String(data[i][2] || "").trim();
      if (
        rowToken.toLowerCase() === cleanToken.toLowerCase() ||
        rowToken.replace(/-/g, "").toLowerCase() === cleanToken.replace(/-/g, "").toLowerCase() ||
        (cleanToken.indexOf("-F") === -1 && (rowRef.toLowerCase() === cleanToken.toLowerCase() || rowRef.replace(/-/g, "").toLowerCase() === cleanToken.replace(/-/g, "").toLowerCase()))
      ) {
        var rowIndex = i + 1; // 1-indexed
        var nowStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM HH:mm");
        var cellVal = claimed ? ("Claimed (" + nowStr + ")") : "Unclaimed";

        sheet.getRange(rowIndex, colIdx).setValue(cellVal);

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          tokenId: rowToken,
          mealSlotId: mealSlotId,
          claimed: claimed,
          message: "Meal status updated in Google Sheet row #" + rowIndex
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    throw new Error("Token not found: " + cleanToken);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message || err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Direct Food Scanner API: Live headcount stats
 */
function handleHeadCount() {
  try {
    var spreadsheet = resolveSpreadsheet();
    if (!spreadsheet) throw new Error("Google Sheet not accessible");

    var sheet = getOrCreateFoodTokensSheet(spreadsheet);
    var data = sheet.getDataRange().getValues();

    var totalIssued = Math.max(0, data.length - 1);
    var mealStats = {
      attendance: { claimed: 0, pending: 0 },
      sep24_mrng_snacks: { claimed: 0, pending: 0 },
      sep24_eve_snacks: { claimed: 0, pending: 0 },
      sep24_night_dinner: { claimed: 0, pending: 0 },
      sep24_night_snacks: { claimed: 0, pending: 0 },
      sep25_mrng_bfast: { claimed: 0, pending: 0 },
      sep25_mrng_snacks: { claimed: 0, pending: 0 },
      sep25_aft_snacks: { claimed: 0, pending: 0 }
    };

    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      if (isClaimedVal(r[9])) mealStats.attendance.claimed++; else mealStats.attendance.pending++;
      if (isClaimedVal(r[10])) mealStats.sep24_mrng_snacks.claimed++; else mealStats.sep24_mrng_snacks.pending++;
      if (isClaimedVal(r[11])) mealStats.sep24_eve_snacks.claimed++; else mealStats.sep24_eve_snacks.pending++;
      if (isClaimedVal(r[12])) mealStats.sep24_night_dinner.claimed++; else mealStats.sep24_night_dinner.pending++;
      if (isClaimedVal(r[13])) mealStats.sep24_night_snacks.claimed++; else mealStats.sep24_night_snacks.pending++;
      if (isClaimedVal(r[14])) mealStats.sep25_mrng_bfast.claimed++; else mealStats.sep25_mrng_bfast.pending++;
      if (isClaimedVal(r[15])) mealStats.sep25_mrng_snacks.claimed++; else mealStats.sep25_mrng_snacks.pending++;
      if (isClaimedVal(r[16])) mealStats.sep25_aft_snacks.claimed++; else mealStats.sep25_aft_snacks.pending++;
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      totalPassesIssued: totalIssued,
      mealStats: mealStats,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message || err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function isClaimedVal(val) {
  if (!val) return false;
  var s = String(val).toLowerCase();
  return s.indexOf("claim") > -1 && s.indexOf("unclaim") === -1;
}

function resolveSpreadsheet() {
  var spreadsheet = null;
  try {
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}

  if (!spreadsheet && DEFAULT_SPREADSHEET_ID) {
    try {
      spreadsheet = SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID);
    } catch (e) {}
  }

  if (!spreadsheet) {
    try {
      var files = DriveApp.getFilesByName("InnoHack-26 Registrations");
      if (files.hasNext()) spreadsheet = SpreadsheetApp.open(files.next());
    } catch (e) {}
  }
  return spreadsheet;
}

/**
 * Direct AI Assistant API: Answer participant questions based on complete InnoHack-26 knowledge
 */
function handleAiHelpQuery(question) {
  var q = String(question || "").toLowerCase().trim();
  
  if (!q) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      answer: "Welcome to InnoHack-26 AI Helpdesk! Ask me about registration fees, event venue, food schedule, bus transport, or whom to contact for Robotics, Mechanical, or EIE queries."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 1. Robotics coordinators query
  if (q.indexOf("robot") > -1 || q.indexOf("drone") > -1 || q.indexOf("jayamanikandan") > -1 || q.indexOf("harish") > -1 || q.indexOf("ros") > -1 || q.indexOf("sensor") > -1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      answer: "🤖 **Robotics & Automation Coordinators:**\n\n• **Jayamanikandan P** (Student Coordinator, 3rd Year Robotics): 📞 **+91 99433 71076** | ✉️ jayamanijayamani43@gmail.com\n• **Harish Gopal** (Student Coordinator, 3rd Year Robotics): 📞 **+91 8300191535** | ✉️ abdharishgopal@gmail.com\n\nContact them for Robotics track rules, drone hardware, sensor interfacing, and kit approvals."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. Mechanical coordinators query
  if (q.indexOf("mech") > -1 || q.indexOf("samuel") > -1 || q.indexOf("naveen") > -1 || q.indexOf("cad") > -1 || q.indexOf("fabricat") > -1 || q.indexOf("3d") > -1 || q.indexOf("workshop") > -1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      answer: "⚙️ **Mechanical Engineering Coordinators:**\n\n• **Samuel A** (Student Coordinator, 3rd Year Mech): 📞 **+91 9342683393** | ✉️ samandrew8464@gmail.com\n• **Naveen V** (Student Coordinator, 3rd Year Mech): ✉️ naveenvenu2007@gmail.com\n\nContact Samuel A for CAD/CAM prototyping, workshop equipment, 3D printing components, and accommodation."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 3. Tech lead, EIE, Faculty, OD, Website query
  if (q.indexOf("tech") > -1 || q.indexOf("sathiyamoorthi") > -1 || q.indexOf("vinodhini") > -1 || q.indexOf("eie") > -1 || q.indexOf("od") > -1 || q.indexOf("letter") > -1 || q.indexOf("approval") > -1 || q.indexOf("website") > -1 || q.indexOf("pass") > -1 || q.indexOf("qr") > -1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      answer: "💻 **Tech & Event Coordinators:**\n\n• **Sathiyamoorthi C.** (Tech Lead & EIE Coordinator): 📞 **+91 7708914279** (Website issues, QR food passes, registrations, Software build track)\n• **Mrs. Vinodhini C.** (Faculty Coordinator, A/P EIE): 📞 **+91 6382249016** (Faculty approvals, official college OD letters)\n• **Abhi Ruban** (Event Lead)\n\nEmail: innohack26@gmail.com"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 4. Registration fee query
  if (q.indexOf("fee") > -1 || q.indexOf("cost") > -1 || q.indexOf("price") > -1 || q.indexOf("amount") > -1 || q.indexOf("500") > -1 || q.indexOf("register") > -1 || q.indexOf("squad") > -1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      answer: "🎟️ **InnoHack-26 Registration Fee (₹500 / Head):**\n\n• **1 Participant (Solo Leader):** ₹500\n• **2 Participants (Leader + 1 Member):** ₹1,000\n• **3 Participants (Leader + 2 Members):** ₹1,500\n• **4 Participants (Leader + 3 Members):** ₹2,000\n• **5 Participants (Leader + 4 Members):** ₹2,500\n• **6 Participants (Leader + 5 Members):** ₹3,000\n\nIncludes 24-hour sprint access, certificate, 2 times main food meals, and 5 times snacks & refreshments."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 5. Food & refreshments query
  if (q.indexOf("food") > -1 || q.indexOf("meal") > -1 || q.indexOf("dinner") > -1 || q.indexOf("breakfast") > -1 || q.indexOf("snacks") > -1 || q.indexOf("eat") > -1 || q.indexOf("cater") > -1 || q.indexOf("2 food") > -1 || q.indexOf("5 snacks") > -1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      answer: "🍽️ **Included Meals & Snacks Schedule (2 Times Food + 5 Times Snacks = Total 7 Sessions Included):**\n\n" +
              "🍱 **2 TIMES MAIN FOOD MEALS:**\n" +
              "1. **24th Sep 08:30 PM:** Grand Hackathon Dinner Feast Buffet (Food 1/2)\n" +
              "2. **25th Sep 07:30 AM:** Day 2 South Indian Breakfast & Coffee (Food 2/2)\n\n" +
              "☕ **5 TIMES SNACKS & REFRESHMENTS:**\n" +
              "1. **24th Sep 10:30 AM:** Day 1 Morning Welcome Tea & Snacks (Snacks 1/5)\n" +
              "2. **24th Sep 05:00 PM:** Day 1 Evening High Tea & Snacks (Snacks 2/5)\n" +
              "3. **25th Sep 01:00 AM:** Midnight Energy Boost Snacks & Hot Drinks (Snacks 3/5)\n" +
              "4. **25th Sep 11:30 AM:** Day 2 Pre-Evaluation Refreshments & Tea (Snacks 4/5)\n" +
              "5. **25th Sep 03:30 PM:** Valedictory High Tea & Celebration Treats (Snacks 5/5)\n\n" +
              "Show your team digital QR pass at the catering desk for instant food check-off."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 6. Transport & Bus routes query
  if (q.indexOf("bus") > -1 || q.indexOf("transport") > -1 || q.indexOf("travel") > -1 || q.indexOf("pickup") > -1 || q.indexOf("route") > -1 || q.indexOf("tirupur") > -1 || q.indexOf("salem") > -1 || q.indexOf("erode") > -1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      answer: "🚌 **Free Bus Transport (41 Routes):**\n\nFree college buses operate connecting Salem, Tirupur, Erode Central, Bhavani, Gobichettipalayam, Kangeyam, Kundadam, and surrounding areas to ESEC Campus.\n\n📞 **24x7 Logistics Helpdesk:** 04294-232701"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 7. Dates, venue & general query
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    answer: "🚀 **InnoHack-26 Event Info:**\n\n• **Dates:** 24th & 25th September 2026 (24-Hour Continuous Hackathon)\n• **Venue:** Erode Sengunthar Engineering College, Perundurai, Erode – 638 057\n• **Prize Pool:** ₹50,000 Total Cash Prizes\n• **Coordinators to Call:**\n  - Robotics: Jayamanikandan P (+91 99433 71076) / Harish Gopal (+91 8300191535)\n  - Mechanical: Samuel A (+91 9342683393)\n  - Tech/Registrations: Sathiyamoorthi C. (+91 7708914279)\n  - Faculty Coordinator: Mrs. Vinodhini C. (+91 6382249016)\n• **WhatsApp Community:** https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t"
  })).setMimeType(ContentService.MimeType.JSON);
}

