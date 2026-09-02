/**
 * ============================================================================
 * INNOHACK-26: GOOGLE APPS SCRIPT BACKEND (GOOGLE DRIVE & SHEETS INTEGRATION)
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
    version: "2.0-in-cell-images",
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
    
    let spreadsheet;
    try {
      if (targetSpreadsheetId) {
        spreadsheet = SpreadsheetApp.openById(targetSpreadsheetId);
      }
    } catch (openErr) {
      Logger.log("Could not open by ID, trying active: " + openErr);
    }

    if (!spreadsheet) {
      try {
        spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      } catch (activeErr) {
        Logger.log("No active spreadsheet: " + activeErr);
      }
    }

    if (!spreadsheet) {
      throw new Error("Target Google Sheet not found. Please verify spreadsheet ID: " + targetSpreadsheetId);
    }

    // 1. Handle Photo Upload to Google Drive if provided
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
        
        // In-cell visible image preview: clicking it opens full resolution in Google Drive!
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

    // 2. Format Timestamp (Asia/Kolkata IST)
    const formattedTimestamp = Utilities.formatDate(
      reg.submittedAt ? new Date(reg.submittedAt) : new Date(),
      "Asia/Kolkata",
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

    // 4. Append to "Form Responses 1"
    const allSheet = getOrCreateSheet(spreadsheet, "Form Responses 1");
    allSheet.appendRow(row);
    formatRowWithImage(allSheet, allSheet.getLastRow(), Boolean(fileId || photoFormula));

    // Also append to "All Registrations" if present
    const allRegSheet = spreadsheet.getSheetByName("All Registrations");
    if (allRegSheet) {
      allRegSheet.appendRow(row);
      formatRowWithImage(allRegSheet, allRegSheet.getLastRow(), Boolean(fileId || photoFormula));
    }

    // 5. Append to Build Type Sheet (Software or Hardware)
    const buildTypeSheetName = (reg.buildType === "hardware") ? "Hardware" : "Software";
    const buildSheet = getOrCreateSheet(spreadsheet, buildTypeSheetName);
    buildSheet.appendRow(row);
    formatRowWithImage(buildSheet, buildSheet.getLastRow(), Boolean(fileId || photoFormula));

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      referenceCode: reg.referenceCode,
      photoUrl: photoUrl,
      fileId: fileId,
      message: "Registration recorded successfully with in-cell image preview"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error processing registration: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message || error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function formatRowWithImage(sheet, rowIndex, hasImage) {
  try {
    if (rowIndex <= 1) return;
    // Set row height to 70px so the screenshot thumbnail is clearly visible
    sheet.setRowHeight(rowIndex, 70);
    sheet.setColumnWidth(18, 140);
    const range = sheet.getRange(rowIndex, 1, 1, HEADERS.length);
    range.setVerticalAlignment("middle");
    range.setHorizontalAlignment("left");
    // Center the photo preview cell
    sheet.getRange(rowIndex, 18).setHorizontalAlignment("center");
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
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#0F172A");
  headerRange.setFontColor("#F8FAFC");
  headerRange.setVerticalAlignment("middle");
  headerRange.setHorizontalAlignment("center");
  sheet.setRowHeight(1, 35);
  sheet.setColumnWidth(18, 140); // Screenshot column width
  sheet.setFrozenRows(1);
}

/**
 * ONE-CLICK FIX FOR EXISTING ROWS:
 * Select this function in the toolbar dropdown and click "Run".
 * It will instantly convert all existing "View Screenshot" links and plain URLs
 * into visible in-cell images across all sheets!
 */
function fixExistingRowsToViewImages() {
  const spreadsheet = SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID) || SpreadsheetApp.getActiveSpreadsheet();
  const sheets = spreadsheet.getSheets();
  let convertedCount = 0;

  sheets.forEach(function(sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return;

    formatHeaderRow(sheet);

    for (let r = 2; r <= lastRow; r++) {
      const cell = sheet.getRange(r, 18);
      const formula = cell.getFormula() || "";
      const val = String(cell.getValue() || "");
      const combined = formula + " " + val;

      let fileId = null;
      const idMatch = combined.match(/\/d\/([a-zA-Z0-9_-]+)/) || combined.match(/id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        fileId = idMatch[1];
      }

      if (fileId) {
        const driveView = `https://drive.google.com/file/d/${fileId}/view`;
        const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
        cell.setFormula(`=HYPERLINK("${driveView}", IMAGE("${thumbUrl}", 1))`);
        convertedCount++;
      }

      sheet.setRowHeight(r, 70);
      sheet.getRange(r, 1, 1, HEADERS.length).setVerticalAlignment("middle");
      cell.setHorizontalAlignment("center");
    }
  });

  Logger.log("Successfully converted " + convertedCount + " screenshot cells to visible in-cell images with 70px height!");
}

/**
 * Run this function directly inside Apps Script editor to authorize permissions and test!
 */
function testRun() {
  const sampleBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const mockEvent = {
    postData: {
      contents: JSON.stringify({
        spreadsheetId: DEFAULT_SPREADSHEET_ID,
        registration: {
          referenceCode: "IH26-IMAGE-TEST-" + Math.floor(Math.random() * 10000),
          teamName: "InnoHack Signal Squad",
          leadName: "Test Organizer",
          email: "test@innohack.org",
          phone: "+919876543210",
          college: "InnoHack Campus",
          memberCount: 2,
          memberOne: "Test Organizer",
          memberTwo: "Squad Mate",
          domain: "Open Innovation",
          buildType: "software",
          transactionId: "UPI-TEST-IMAGE-OK",
          paymentStatus: "payment_pending",
          submittedAt: new Date().toISOString(),
          photoBase64: sampleBase64,
          photoName: "test_receipt.png",
          photoType: "image/png"
        }
      })
    }
  };
  const response = doPost(mockEvent);
  Logger.log("Response: " + response.getContent());
}
