# Google Sheets & Google Drive Backend Setup Guide

InnoHack-26 connects directly to Google Sheets and Google Drive to store registrations and payment screenshots like a **Google Form response sheet**.

---

## Quick 2-Minute Setup

### Step 1: Create or Open a Google Sheet
1. Open [Google Sheets](https://sheets.new) and create a new spreadsheet (e.g. `InnoHack-26 Registrations`).

### Step 2: Add the Google Apps Script
1. In the Google Sheet top menu, go to: **Extensions** → **Apps Script**.
2. Delete any existing code in the editor.
3. Open [`google-apps-script.js`](file:///Users/apple/Downloads/innohack26-event-site/google-apps-script.js) in this project, copy its entire contents, and paste it into the Apps Script editor.
4. Click the **Save** (disk) icon.

### Step 3: Deploy as a Web App
1. In the top-right corner of the Apps Script editor, click **Deploy** → **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Configure the deployment settings:
   - **Description**: `InnoHack-26 Registration Backend`
   - **Execute as**: `Me (<your-email>)`
   - **Who has access**: `Anyone` *(required so your Vercel serverless backend can post responses)*
4. Click **Deploy**.
5. Click **Authorize access**, choose your Google account, and click **Advanced** → **Go to InnoHack-26 (unsafe)** → **Allow**.
6. **Copy the Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).

### Step 4: Add to Vercel Environment Variables
In your **Vercel Project Settings → Environment Variables** (and your local `.env` file):

```env
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/AKfycb.../exec
```

---

## How it Works (Like Google Forms)

When a participant submits the registration form:
1. **Spreadsheet Rows**: A formatted row is automatically appended to:
   - **`Form Responses 1`** (All registrations)
   - **`Software`** or **`Hardware`** (Categorized tabs)
2. **Google Drive Photos**:
   - The payment screenshot is automatically saved into a Google Drive folder named `InnoHack-26 Payment Screenshots`.
   - The file is set to anyone with the link can view.
   - The Google Sheet column **"Payment Screenshot / Photo"** displays `=HYPERLINK(driveUrl, "View Screenshot")` so organisers can click and view payment proof directly inside Google Sheets!
3. **Up to 6 Squad Members**:
   - Supports 1 to 6 members: Team Lead + Members with full names, phone numbers, domain, and transaction ID / UTR.
