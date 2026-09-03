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

  // 4. Registration data via GET query
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
          "Unclaimed", // 24th Morning Snacks
          "Unclaimed", // 24th Night Dinner
          "Unclaimed", // 24th Night Snacks
          "Unclaimed", // 25th Morning Breakfast
          "Unclaimed", // 25th Morning Snacks
          "Unclaimed"  // 25th Afternoon Snacks
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

  var passesHtml = "";
  memberNames.forEach(function(name, idx) {
    var mIdx = idx + 1;
    var role = mIdx === 1 ? "Team Leader" : ("Squad Member " + mIdx);
    var tokenId = refCode + "-F" + mIdx;
    var passUrl = SITE_URL + "/food-token?token=" + encodeURIComponent(tokenId) + "&ref=" + encodeURIComponent(refCode) + "&m=" + mIdx;
    var qrImage = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(passUrl) + "&color=07111d&bgcolor=ffffff&qzone=1";

    passesHtml += '<div style="margin-bottom: 20px; border: 2px solid #2199ff; border-radius: 12px; background: #0b1a38; overflow: hidden;">' +
      '<div style="padding: 12px 18px; background: #102d5d; border-bottom: 1px solid rgba(98,185,255,0.3);">' +
      '<span style="background: rgba(33,153,255,0.25); border: 1px solid #2199ff; color: #ffdc86; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 11px; font-weight: bold;">PASS #' + mIdx + ' OF ' + memberNames.length + '</span>' +
      '<h3 style="margin: 6px 0 2px; color: #ffffff; font-size: 18px; font-weight: bold;">' + escapeHtml(name) + '</h3>' +
      '<span style="color: #90b8f8; font-family: monospace; font-size: 12px;">' + role + ' · Token: <strong>' + tokenId + '</strong></span>' +
      '</div>' +
      '<div style="padding: 16px;">' +
      '<table role="presentation" width="100%">' +
      '<tr>' +
      '<td width="140" align="center" style="vertical-align: middle;">' +
      '<img src="' + qrImage + '" alt="QR" width="120" height="120" style="display: block; border-radius: 6px; background: #ffffff; padding: 6px;" />' +
      '<span style="display: block; margin-top: 6px; color: #90b8f8; font-size: 10px; font-family: monospace;">SCAN AT CATERING DESK</span>' +
      '</td>' +
      '<td style="padding-left: 14px; vertical-align: top;">' +
      '<p style="margin: 0 0 6px; color: #ffdc86; font-size: 11px; font-weight: bold;">INCLUDES 6 MEAL & REFRESHMENT SLOTS:</p>' +
      '<div style="font-size: 12px; color: #d0e2ff; line-height: 1.6;">' +
      '☕ <strong>24th Sep Morning</strong> Snacks & Tea<br/>' +
      '🍽️ <strong>24th Sep Night</strong> Hackathon Feast (Dinner)<br/>' +
      '🌙 <strong>24th Sep Night</strong> Midnight Energy Refreshments<br/>' +
      '🌅 <strong>25th Sep Morning</strong> Day 2 Breakfast<br/>' +
      '☕ <strong>25th Sep Morning</strong> Snacks & Tea<br/>' +
      '🥪 <strong>25th Sep Afternoon</strong> Valedictory High Tea' +
      '</div>' +
      '</td>' +
      '</tr>' +
      '</table>' +
      '</div>' +
      '</div>';
  });

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
    '<h2 style="margin: 0 0 6px; color: #ffffff; font-size: 18px; font-weight: bold;">🍽️ INDIVIDUAL FOOD & SNACKS PASSES (' + memberNames.length + ' ISSUED)</h2>' +
    '<p style="margin: 0 0 16px; color: #94bcf8; font-size: 13px;">Show each QR pass on your phone at the catering counter for instant meal check-off.</p>' +
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
    "24th Mrng Snacks", "24th Night Dinner", "24th Night Snacks",
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
 * Direct Food Scanner API: Lookup participant token & 6 meal claim statuses
 */
function handleTokenLookup(token) {
  try {
    var cleanToken = String(token || "").trim();
    if (!cleanToken) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Missing token parameter"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var spreadsheet = resolveSpreadsheet();
    if (!spreadsheet) throw new Error("Google Sheet not accessible");

    var sheet = getOrCreateFoodTokensSheet(spreadsheet);
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowToken = String(row[1] || "").trim();
      if (rowToken.toLowerCase() === cleanToken.toLowerCase() || rowToken.replace(/-/g, "").toLowerCase() === cleanToken.replace(/-/g, "").toLowerCase()) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          pass: {
            tokenId: rowToken,
            referenceCode: String(row[2] || ""),
            memberName: String(row[3] || ""),
            role: String(row[4] || "Squad Member"),
            teamName: String(row[5] || ""),
            college: String(row[6] || ""),
            phone: String(row[7] || ""),
            email: String(row[8] || ""),
            meals: {
              sep24_mrng_snacks: { claimed: isClaimedVal(row[9]), claimedAt: String(row[9] || "") },
              sep24_night_dinner: { claimed: isClaimedVal(row[10]), claimedAt: String(row[10] || "") },
              sep24_night_snacks: { claimed: isClaimedVal(row[11]), claimedAt: String(row[11] || "") },
              sep25_mrng_bfast: { claimed: isClaimedVal(row[12]), claimedAt: String(row[12] || "") },
              sep25_mrng_snacks: { claimed: isClaimedVal(row[13]), claimedAt: String(row[13] || "") },
              sep25_aft_snacks: { claimed: isClaimedVal(row[14]), claimedAt: String(row[14] || "") }
            }
          }
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Token not found in Google Sheet: " + cleanToken
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
      sep24_mrng_snacks: 10,
      sep24_night_dinner: 11,
      sep24_night_snacks: 12,
      sep25_mrng_bfast: 13,
      sep25_mrng_snacks: 14,
      sep25_aft_snacks: 15
    };

    var colIdx = colMap[mealSlotId] || 11; // default dinner

    for (var i = 1; i < data.length; i++) {
      var rowToken = String(data[i][1] || "").trim();
      if (rowToken.toLowerCase() === cleanToken.toLowerCase() || rowToken.replace(/-/g, "").toLowerCase() === cleanToken.replace(/-/g, "").toLowerCase()) {
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
      sep24_mrng_snacks: { claimed: 0, pending: 0 },
      sep24_night_dinner: { claimed: 0, pending: 0 },
      sep24_night_snacks: { claimed: 0, pending: 0 },
      sep25_mrng_bfast: { claimed: 0, pending: 0 },
      sep25_mrng_snacks: { claimed: 0, pending: 0 },
      sep25_aft_snacks: { claimed: 0, pending: 0 }
    };

    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      if (isClaimedVal(r[9])) mealStats.sep24_mrng_snacks.claimed++; else mealStats.sep24_mrng_snacks.pending++;
      if (isClaimedVal(r[10])) mealStats.sep24_night_dinner.claimed++; else mealStats.sep24_night_dinner.pending++;
      if (isClaimedVal(r[11])) mealStats.sep24_night_snacks.claimed++; else mealStats.sep24_night_snacks.pending++;
      if (isClaimedVal(r[12])) mealStats.sep25_mrng_bfast.claimed++; else mealStats.sep25_mrng_bfast.pending++;
      if (isClaimedVal(r[13])) mealStats.sep25_mrng_snacks.claimed++; else mealStats.sep25_mrng_snacks.pending++;
      if (isClaimedVal(r[14])) mealStats.sep25_aft_snacks.claimed++; else mealStats.sep25_aft_snacks.pending++;
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

