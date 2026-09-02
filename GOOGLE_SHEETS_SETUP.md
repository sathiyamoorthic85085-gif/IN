# InnoHack-26 Backend Setup Guide

InnoHack-26 supports **3 backend options** for storing registrations and payment proof photos. You can choose the one that fits your workflow best.

---

## Backend Option 1: Google Apps Script Webhook (Recommended & Easiest)
*Acts exactly like a Google Form response sheet, with in-cell image viewing and zero Google Cloud console setup.*

### Step 1: Open Your Google Sheet
1. Open your Google Sheet (e.g. [InnoHack-26 Registrations](https://sheets.new)).

### Step 2: Paste the Apps Script
1. In the top menu, go to **Extensions → Apps Script**.
2. Delete everything in the code editor.
3. Copy all code from [`google-apps-script.js`](file:///Users/apple/Downloads/innohack26-event-site/google-apps-script.js) and paste it into the editor.
4. Click **Save** (disk icon).

### Step 3: Run Test & One-Click Fix (If you have existing rows)
1. In the toolbar function dropdown, select **`testRun`** and click **Run** (Authorize access if prompted).
2. If you already have existing rows with text links, select **`fixExistingRowsToViewImages`** and click **Run**. This will instantly convert all old rows into visible in-cell images and expand row heights!

### Step 4: Deploy Web App
1. Click **Deploy → New deployment** (or **Manage deployments → Edit (pencil icon) → New version** if updating).
2. Set:
   - **Type**: `Web app`
   - **Description**: `InnoHack-26 Registration Backend (In-Cell Images)`
   - **Execute as**: `Me (<your-google-account>)`
   - **Who has access**: `Anyone` *(Required for registration form to submit)*
3. Click **Deploy** → **Authorize access** → select your Google account → click **Advanced** → **Go to InnoHack-26 (unsafe)** → **Allow**.
4. Copy the **Web App URL** (e.g., `https://script.google.com/macros/s/.../exec`).

### Step 5: Add to Vercel
In your **Vercel Project Settings → Environment Variables**:
```env
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/your-deployment-id/exec
```

---

## Backend Option 2: Google Service Account (Direct API)
*Uses Google Cloud Service Account (`innohack-26@innohack-26.iam.gserviceaccount.com`).*

### Step 1: Share Your Google Sheet with the Service Account
1. Open your Google Sheet.
2. Click the **Share** button in the top right.
3. Enter the service account email:
   ```text
   innohack-26@innohack-26.iam.gserviceaccount.com
   ```
4. Set permission to **Editor** and click **Share**.

### Step 2: Add Environment Variables to Vercel
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=innohack-26@innohack-26.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_SHEETS_SPREADSHEET_ID=your-google-sheet-id
```

---

## Backend Option 3: SQL Database (MySQL / TiDB / Supabase)
*Full AES-256-GCM encrypted database records with `/admin/registrations` download.*

Add to Vercel:
```env
DATABASE_URL=mysql://username:password@host:port/database
REGISTRATION_ENCRYPTION_SECRET=your-32-char-random-secret
COOKIE_SECRET=your-session-cookie-secret
```

---

## How Payment Screenshots Are Displayed in Google Sheet:
1. **In-Cell Visible Thumbnail**: Google Sheets embeds the screenshot preview directly in Column 18 (`=HYPERLINK(driveUrl, IMAGE(thumbnailUrl, 1))`).
2. **One-Click Full Resolution**: Clicking or hovering the image inside the sheet immediately opens the full-size original photo in Google Drive in a new tab.
3. **Auto-Sized Row Height**: Rows with images automatically format to 70px height and 140px width so previews are instantly clear to the organisers.
