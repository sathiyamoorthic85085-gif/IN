# InnoHack-26 Backend Setup Guide

InnoHack-26 supports **3 backend options** for storing registrations and payment proof photos. You can choose the one that fits your workflow best.

---

## Backend Option 1: Google Apps Script Webhook (Recommended & Easiest)
*Acts exactly like a Google Form response sheet, with zero Google Cloud console setup.*

### Step 1: Open Your Google Sheet
1. Open your Google Sheet (e.g. [InnoHack-26 Registrations](https://sheets.new)).

### Step 2: Paste the Apps Script
1. In the top menu, go to **Extensions → Apps Script**.
2. Delete everything in the code editor.
3. Copy all code from [`google-apps-script.js`](file:///Users/apple/Downloads/innohack26-event-site/google-apps-script.js) and paste it into the editor.
4. Click **Save** (disk icon).

### Step 3: Deploy Web App
1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and select **Web app**.
3. Set:
   - **Description**: `InnoHack-26 Registration Backend`
   - **Execute as**: `Me (<your-google-account>)`
   - **Who has access**: `Anyone` *(Required for Vercel to submit)*
4. Click **Deploy** → **Authorize access** → select your Google account → click **Advanced** → **Go to InnoHack-26 (unsafe)** → **Allow**.
5. Copy the **Web App URL** (e.g., `https://script.google.com/macros/s/.../exec`).

### Step 4: Add to Vercel
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

## What Happens When a Participant Registers:
1. **Google Sheet Columns**:
   `[Timestamp, Reference Code, Team Name, Team Lead Name, Email, Phone, College, Squad Size, Member 1, Member 2, Member 3, Member 4, Member 5, Member 6, Domain, Build Type, Transaction ID / UTR, Payment Screenshot / Photo, Payment Status]`
2. **Payment Screenshots**: Automatically saved to Google Drive and hyperlinked in the sheet (`=HYPERLINK(url, "View Screenshot")`).
3. **Reference Code**: Participant receives instant confirmation with their unique reference code (e.g. `IH26-M5X9-ABC12`).
