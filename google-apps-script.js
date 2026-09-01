/**
 * ============================================================================
 * INNOHACK-26: GOOGLE APPS SCRIPT BACKEND (GOOGLE FORM STYLE)
 * ============================================================================
 *
 * This Apps Script acts as the backend for InnoHack-26 squad registrations.
 * It receives registrations and payment screenshots, stores the images in
 * Google Drive, and appends the formatted data to Google Sheets just like
 * a Google Form output.
 *
 * HOW TO DEPLOY:
 * 1. Open Google Sheets (create a new sheet or use an existing one).
 * 2. In the top menu, click: Extensions -> Apps Script.
 * 3. Delete any code in the editor and paste THIS ENTIRE FILE.
 * 4. Click the blue "Deploy" button (top right) -> "New deployment".
 * 5. Select type: "Web app".
 * 6. Set:
 *    - Description: "InnoHack-26 Registration Backend"
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone" (allows Vercel serverless to post)
 * 7. Click "Deploy", authorize permissions, and copy the Web App URL!
 * 8. Add to your Vercel Environment Variables:
 *    GOOGLE_SHEETS_WEBHOOK_URL = <the copied Web App URL>
 * ============================================================================
 */

const FOLDER_NAME = "InnoHack-26 Payment Screenshots";
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
  "Transaction ID / UTR",
  "Payment Screenshot / Photo",
  "Payment Status"
];

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "InnoHack-26 Registration Google Sheets Backend",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      payload = e.parameter;
    } else {
      throw new Error("No data received");
    }

    const reg = payload.registration || payload;
    const spreadsheet = payload.spreadsheetId
      ? SpreadsheetApp.openById(payload.spreadsheetId)
      : SpreadsheetApp.getActiveSpreadsheet();

    if (!spreadsheet) {
      throw new Error("No active spreadsheet found. Please bind this script to a Google Sheet or provide spreadsheetId.");
    }

    // 1. Handle Photo Upload to Google Drive if provided
    let photoUrl = "";
    let photoFormula = "";
    if (reg.photoBase64) {
      try {
        const driveFolder = getOrCreateFolder(FOLDER_NAME);
        const cleanBase64 = reg.photoBase64.replace(/^data:image\/\w+;base64,/, "");
        const decodedBytes = Utilities.base64Decode(cleanBase64);
        const mimeType = reg.photoType || "image/jpeg";
        const extension = mimeType.split("/")[1] || "jpg";
        const fileName = `${reg.referenceCode || "REG"}_Payment_${Date.now()}.${extension}`;
        
        const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
        const file = driveFolder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        photoUrl = file.getUrl();
        photoFormula = `=HYPERLINK("${photoUrl}", "View Screenshot")`;
      } catch (uploadError) {
        Logger.log("Failed to upload image to Drive: " + uploadError.toString());
        photoUrl = "Upload error: " + uploadError.toString();
        photoFormula = photoUrl;
      }
    } else if (reg.photoUrl) {
      photoUrl = reg.photoUrl;
      photoFormula = `=HYPERLINK("${photoUrl}", "View Screenshot")`;
    }

    // 2. Format Timestamp
    const formattedTimestamp = Utilities.formatDate(
      reg.submittedAt ? new Date(reg.submittedAt) : new Date(),
      Session.getScriptTimeZone() || "Asia/Kolkata",
      "dd/MM/yyyy HH:mm:ss"
    );

    // 3. Build Row Data
    const row = [
      formattedTimestamp,
      reg.referenceCode || "",
      reg.teamName || "",
      reg.leadName || "",
      reg.email || "",
      reg.phone || "",
      reg.college || "",
      Number(reg.memberCount || 1),
      reg.memberOne || "",
      reg.memberTwo || "",
      reg.memberThree || "",
      reg.memberFour || "",
      reg.memberFive || "",
      reg.memberSix || "",
      reg.domain || "",
      (reg.buildType || "software").toUpperCase(),
      reg.transactionId || "",
      photoFormula || photoUrl || "No screenshot attached",
      reg.paymentStatus || "payment_pending"
    ];

    // 4. Append to "Form Responses 1" (All Submissions)
    const allSheet = getOrCreateSheet(spreadsheet, "Form Responses 1");
    allSheet.appendRow(row);

    // 5. Append to Build Type Sheet (Software or Hardware)
    const buildTypeSheetName = (reg.buildType === "hardware") ? "Hardware" : "Software";
    const buildSheet = getOrCreateSheet(spreadsheet, buildTypeSheetName);
    buildSheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      referenceCode: reg.referenceCode,
      photoUrl: photoUrl,
      message: "Registration recorded successfully"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error processing registration: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message || error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
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
    
    // Format Header Row
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#0F172A");
    headerRange.setFontColor("#F8FAFC");
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#0F172A");
    headerRange.setFontColor("#F8FAFC");
    sheet.setFrozenRows(1);
  }
  return sheet;
}
