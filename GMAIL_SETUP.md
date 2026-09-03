# InnoHack-26: Automated Gmail Confirmation & Food Token System

This document explains how the **Automated Gmail Confirmation**, **Dynamic ₹500/Head Calculation**, and **Organiser Meal Scanner** work in InnoHack-26.

---

## 1. How Gmail Confirmation Works

InnoHack-26 supports **2 Seamless Email Dispatch Modes**:

### Option A: Google Apps Script Webhook (Zero SMTP Setup Required - Recommended)
When you deploy `google-apps-script.js` as a Web App connected to your Google Sheet:
- Every registration automatically triggers `sendConfirmationGmail(...)`.
- Google Apps Script uses Google's native `MailApp.sendEmail` / `GmailApp.sendEmail` API to send the email directly from the organizer's Gmail account for free.
- **Features included in the email**:
  - High-resolution InnoHack-26 Poster as top cover banner.
  - Squad details and unique Reference Code (`IH26-XXXXX`).
  - Total Fee Calculation: $\text{Squad Size} \times ₹500 = ₹\text{Total Paid}$ and UTR receipt.
  - **Individual Food & Snacks Tokens**: Separate QR passes for **every registered team member**.
  - 6 Meal & Refreshment checkpoints.
  - WhatsApp Community active invite link: `https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t`

### Option B: Node.js / Vercel Serverless SMTP (Gmail App Password)
If you also want the Node / Vercel server to dispatch confirmation emails directly:
1. Go to your [Google Account Security Settings](https://myaccount.google.com/security).
2. Enable **2-Step Verification**.
3. Search for **App Passwords** (or go to `https://myaccount.google.com/apppasswords`).
4. Generate a new App Password named `InnoHack-26 Email`.
5. Add these environment variables to your `.env` or Vercel Project Settings:
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

---

## 2. Dynamic Fee Calculation (₹500 / Head)

The registration fee is dynamically calculated per registered participant:
$$\text{Total Fee} = \text{Squad Size} \times ₹500$$

| Squad Size | Total Amount | Food Passes Issued |
| :--- | :--- | :--- |
| **1 Member** (Lead only) | **₹500** | 1 Pass (`IH26-XXXXX-F1`) |
| **2 Members** | **₹1,000** | 2 Passes (`IH26-XXXXX-F1` to `F2`) |
| **3 Members** | **₹1,500** | 3 Passes (`IH26-XXXXX-F1` to `F3`) |
| **4 Members** | **₹2,000** | 4 Passes (`IH26-XXXXX-F1` to `F4`) |
| **5 Members** | **₹2,500** | 5 Passes (`IH26-XXXXX-F1` to `F5`) |
| **6 Members** | **₹3,000** | 6 Passes (`IH26-XXXXX-F1` to `F6`) |

---

## 3. Meal & Snacks Schedule

Every registered member receives a pass covering **all 6 meal slots**:
- ☕ **24th Sep Morning Snacks** — Welcome Refreshments & Tea (09:00 AM)
- 🍽️ **24th Sep Night Dinner** — Main Hackathon Feast (08:30 PM)
- 🌙 **24th Sep Night Snacks** — Midnight Energy Refreshments (01:00 AM)
- 🌅 **25th Sep Morning Breakfast** — Main Day 2 Breakfast (07:30 AM)
- ☕ **25th Sep Morning Snacks** — Day 2 Morning Tea & Snacks (11:00 AM)
- 🥪 **25th Sep Afternoon Snacks** — Valedictory High Tea (03:30 PM)

---

## 4. Organiser Meal Scanner & Head Count System

### Public Attendee Pass (`/food-token`)
- When an attendee opens their QR link (e.g. `/food-token?token=IH26-XXXXX-F1`), they see a **Read-Only Digital Pass** with their name, squad, and real-time meal redemption badges. Attendees cannot self-check off meals.

### Private Organiser Scanner (`/admin/food-scan`)
- Accessible only to event organisers (gated by organiser email login).
- **Features**:
  - **Live Head Count Dashboard**: Real-time tally of meals served vs remaining across all 6 slots.
  - **Live Camera Barcode/QR Scanner**: Fast continuous scanning with rear camera.
  - **USB/Bluetooth Scanner Support**: Compatible with physical barcode guns.
  - **1-Tap Redemption & Undo**: Instant check-off with timestamps.
  - **Live Audit Feed**: Shows real-time history of recent scans.
