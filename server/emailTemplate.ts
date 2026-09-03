/**
 * InnoHack-26 Registration Confirmation & Food Token Email Template Generator
 */

export interface FoodTokenMember {
  memberIndex: number;
  memberName: string;
  role: string;
  tokenId: string;
  qrUrl: string;
  scanUrl: string;
}

export interface RegistrationEmailData {
  referenceCode: string;
  teamName: string;
  leadName: string;
  email: string;
  phone: string;
  college: string;
  memberCount: number;
  members: string[];
  domain: string;
  buildType: "software" | "hardware";
  transactionId: string;
  amountPaid: number; // calculated as memberCount * 500
  submittedAt: string;
  siteUrl?: string;
  foodTokens?: FoodTokenMember[];
}

export const MEAL_SCHEDULE = [
  { id: "sep24_mrng_snacks", label: "24th Sep Morning Snacks", icon: "☕", type: "snacks", time: "09:00 AM", desc: "Welcome Refreshments & Tea" },
  { id: "sep24_night_dinner", label: "24th Sep Night Dinner", icon: "🍽️", type: "food", time: "08:30 PM", desc: "Main Hackathon Feast" },
  { id: "sep24_night_snacks", label: "24th Sep Night Snacks", icon: "🌙", type: "snacks", time: "01:00 AM", desc: "Midnight Energy Boost" },
  { id: "sep25_mrng_bfast", label: "25th Sep Morning Breakfast", icon: "🌅", type: "food", time: "07:30 AM", desc: "Main Day 2 Breakfast" },
  { id: "sep25_mrng_snacks", label: "25th Sep Morning Snacks", icon: "☕", type: "snacks", time: "11:00 AM", desc: "Day 2 Morning Refreshments" },
  { id: "sep25_aft_snacks", label: "25th Sep Afternoon Snacks", icon: "🥪", type: "snacks", time: "03:30 PM", desc: "Valedictory High Tea" },
] as const;

export function generateFoodTokens(referenceCode: string, members: string[], siteUrl: string = "https://innohack26.vercel.app"): FoodTokenMember[] {
  return members.map((memberName, idx) => {
    const memberIndex = idx + 1;
    const role = memberIndex === 1 ? "Team Leader" : `Squad Member ${memberIndex}`;
    const tokenId = `${referenceCode}-F${memberIndex}`;
    const scanUrl = `${siteUrl.replace(/\/$/, "")}/food-token?token=${encodeURIComponent(tokenId)}&ref=${encodeURIComponent(referenceCode)}&m=${memberIndex}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(scanUrl)}&color=07111d&bgcolor=ffffff&qzone=1`;
    
    return {
      memberIndex,
      memberName,
      role,
      tokenId,
      qrUrl,
      scanUrl,
    };
  });
}

export function renderRegistrationEmailHtml(data: RegistrationEmailData): string {
  const siteUrl = (data.siteUrl || process.env.SITE_URL || "https://innohack26.vercel.app").replace(/\/$/, "");
  const posterUrl = `${siteUrl}/media/innohack26-brochure-qr-updated_769f8c7b.webp`;
  const whatsappCommunityUrl = "https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t";

  const tokens = data.foodTokens && data.foodTokens.length > 0 
    ? data.foodTokens 
    : generateFoodTokens(data.referenceCode, data.members, siteUrl);

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(data.amountPaid);

  const perHeadAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(500);

  // Generate individual member food & snacks passes HTML
  const memberPassesHtml = tokens
    .map(
      (token) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 2px solid #2199ff; border-radius: 12px; background: #0b1a38; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.35);">
      <tr>
        <td style="padding: 16px 20px; background: linear-gradient(90deg, #102d5d, #091834); border-bottom: 1px solid rgba(98,185,255,0.3);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="display: inline-block; padding: 4px 10px; background: rgba(33,153,255,0.2); border: 1px solid #2199ff; border-radius: 4px; color: #ffdc86; font-family: 'Courier New', monospace; font-size: 11px; font-weight: bold; letter-spacing: 1px;">
                  PASS #${token.memberIndex} OF ${tokens.length}
                </span>
                <h3 style="margin: 8px 0 2px; color: #ffffff; font-family: 'Arial', sans-serif; font-size: 20px; font-weight: 800; text-transform: uppercase;">
                  ${escapeHtml(token.memberName)}
                </h3>
                <span style="color: #90b8f8; font-family: 'Courier New', monospace; font-size: 12px;">
                  ${escapeHtml(token.role)} · Squad: <strong>${escapeHtml(data.teamName)}</strong>
                </span>
              </td>
              <td align="right" style="vertical-align: top;">
                <span style="display: block; color: #ffdc86; font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold;">
                  PASS ID
                </span>
                <span style="color: #ffffff; font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold;">
                  ${escapeHtml(token.tokenId)}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <!-- QR Code Column -->
              <td width="150" align="center" style="vertical-align: middle; padding-right: 18px;">
                <div style="background: #ffffff; padding: 10px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
                  <img src="${token.qrUrl}" alt="Food Pass QR Code for ${escapeHtml(token.memberName)}" width="130" height="130" style="display: block; border: 0;" />
                </div>
                <span style="display: block; margin-top: 8px; color: #90b8f8; font-family: 'Courier New', monospace; font-size: 10px; text-align: center;">
                  SCAN AT CATERING DESK
                </span>
              </td>
              <!-- Meals Included Column -->
              <td style="vertical-align: top;">
                <p style="margin: 0 0 10px; color: #ffdc86; font-family: 'Arial', sans-serif; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
                  MEAL & REFRESHMENT PASS INCLUDES:
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Arial', sans-serif; font-size: 12px; color: #d0e2ff;">
                  <tr>
                    <td style="padding: 3px 0;">☕ <strong>24th Sep Morning</strong> Snacks & Tea</td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0;">🍽️ <strong>24th Sep Night</strong> Hackathon Feast (Dinner)</td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0;">🌙 <strong>24th Sep Night</strong> Midnight Energy Refreshments</td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0;">🌅 <strong>25th Sep Morning</strong> Day 2 Breakfast</td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0;">☕ <strong>25th Sep Morning</strong> Snacks & Refreshments</td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0;">🥪 <strong>25th Sep Afternoon</strong> Valedictory High Tea</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InnoHack-26 Registration Confirmed | Ref: ${escapeHtml(data.referenceCode)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030a1c; font-family: 'Arial', sans-serif; -webkit-font-smoothing: antialiased; color: #e2e8f0;">
  <center style="width: 100%; background-color: #030a1c; padding: 24px 0;">
    <!-- Main Email Container -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 650px; margin: 0 auto; background: #07132b; border: 1px solid #16427d; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.6);">
      
      <!-- Poster Cover Image Header -->
      <tr>
        <td style="padding: 0; background: #000000; text-align: center;">
          <a href="${siteUrl}" target="_blank" style="text-decoration: none; display: block;">
            <img src="${posterUrl}" alt="InnoHack-26 24-Hour Hackathon Poster" width="650" style="width: 100%; max-width: 650px; height: auto; display: block; border: 0;" />
          </a>
        </td>
      </tr>

      <!-- Hero Header Banner -->
      <tr>
        <td style="padding: 28px 24px 20px; background: linear-gradient(180deg, #0d234d 0%, #07132b 100%); text-align: center; border-bottom: 1px solid rgba(255,220,134,0.3);">
          <div style="display: inline-block; padding: 6px 14px; background: rgba(255,220,134,0.15); border: 1px solid #ffdc86; border-radius: 20px; margin-bottom: 12px;">
            <span style="color: #ffdc86; font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold; letter-spacing: 1.5px;">
              OFFICIAL REGISTRATION TRANSMISSION
            </span>
          </div>
          <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">
            REGISTRATION <span style="color: #ffdc86;">CONFIRMED!</span>
          </h1>
          <p style="margin: 0; color: #a9c7f8; font-size: 15px; line-height: 1.5;">
            Welcome to <strong>InnoHack-26</strong>! Your squad is locked in for the 24-hour innovation sprint.
          </p>
        </td>
      </tr>

      <!-- Reference Code Box -->
      <tr>
        <td style="padding: 24px 24px 10px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(33,153,255,0.15), rgba(255,220,134,0.1)); border: 2px dashed #ffdc86; border-radius: 12px; padding: 18px; text-align: center;">
            <tr>
              <td>
                <span style="color: #ffdc86; font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">
                  YOUR UNIQUE REGISTRATION REFERENCE
                </span>
                <div style="margin: 8px 0; color: #ffffff; font-family: 'Courier New', monospace; font-size: 26px; font-weight: 900; letter-spacing: 3px; text-shadow: 0 0 12px rgba(33,153,255,0.6);">
                  ${escapeHtml(data.referenceCode)}
                </div>
                <span style="color: #94bcf8; font-size: 12px;">
                  Present this reference code or your individual food pass QR codes during on-campus check-in.
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Squad & Payment Summary Card -->
      <tr>
        <td style="padding: 16px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #091a3a; border: 1px solid rgba(98,185,255,0.25); border-radius: 12px; padding: 20px;">
            <tr>
              <td colspan="2" style="padding-bottom: 12px; border-bottom: 1px solid rgba(98,185,255,0.2);">
                <h3 style="margin: 0; color: #ffdc86; font-size: 16px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">
                  SQUAD & PAYMENT BREAKDOWN
                </h3>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94bcf8; font-size: 13px;">Team Name:</td>
              <td align="right" style="padding: 10px 0; color: #ffffff; font-size: 14px; font-weight: bold;">
                ${escapeHtml(data.teamName)}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94bcf8; font-size: 13px;">Team Leader:</td>
              <td align="right" style="padding: 8px 0; color: #ffffff; font-size: 13px; font-weight: 600;">
                ${escapeHtml(data.leadName)}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94bcf8; font-size: 13px;">College / Institution:</td>
              <td align="right" style="padding: 8px 0; color: #ffffff; font-size: 13px;">
                ${escapeHtml(data.college)}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94bcf8; font-size: 13px;">Innovation Domain:</td>
              <td align="right" style="padding: 8px 0; color: #ffffff; font-size: 13px;">
                ${escapeHtml(data.domain)}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94bcf8; font-size: 13px;">Build Track:</td>
              <td align="right" style="padding: 8px 0; color: #62b9ff; font-size: 13px; font-weight: bold; text-transform: uppercase;">
                ${escapeHtml(data.buildType)} BUILD
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94bcf8; font-size: 13px;">Registered Squad Size:</td>
              <td align="right" style="padding: 8px 0; color: #ffffff; font-size: 13px; font-weight: bold;">
                ${data.memberCount} Participant${data.memberCount > 1 ? "s" : ""}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94bcf8; font-size: 13px;">Registration Fee Rate:</td>
              <td align="right" style="padding: 8px 0; color: #ffffff; font-size: 13px;">
                ${perHeadAmount} / participant
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94bcf8; font-size: 13px;">Total Fee Calculation:</td>
              <td align="right" style="padding: 8px 0; color: #ffdc86; font-size: 13px; font-weight: bold;">
                ${data.memberCount} × ${perHeadAmount} = ${formattedAmount}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94bcf8; font-size: 13px;">Transaction ID / UTR:</td>
              <td align="right" style="padding: 8px 0; color: #ffffff; font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold;">
                ${escapeHtml(data.transactionId)}
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0 4px; border-top: 1px solid rgba(98,185,255,0.2); color: #ffdc86; font-size: 15px; font-weight: bold;">
                TOTAL AMOUNT PAID:
              </td>
              <td align="right" style="padding: 12px 0 4px; border-top: 1px solid rgba(98,185,255,0.2); color: #4ade80; font-size: 18px; font-weight: 900;">
                ${formattedAmount} (VERIFIED)
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Individual Food & Snacks Tokens Section Header -->
      <tr>
        <td style="padding: 24px 24px 12px;">
          <div style="border-left: 4px solid #ffdc86; padding-left: 14px;">
            <h2 style="margin: 0 0 4px; color: #ffffff; font-size: 20px; font-weight: 900; text-transform: uppercase;">
              🍽️ INDIVIDUAL FOOD & SNACKS PASSES (${tokens.length} ISSUED)
            </h2>
            <p style="margin: 0; color: #a9c7f8; font-size: 13px; line-height: 1.4;">
              Each team member has a dedicated QR code pass below. Present this on your phone at the catering counter during each meal slot.
            </p>
          </div>
        </td>
      </tr>

      <!-- Member Passes Rendered Here -->
      <tr>
        <td style="padding: 0 24px;">
          ${memberPassesHtml}
        </td>
      </tr>

      <!-- Event Details & Location Card -->
      <tr>
        <td style="padding: 12px 24px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #091a3a; border: 1px solid rgba(255,220,134,0.3); border-radius: 12px; padding: 20px;">
            <tr>
              <td>
                <h3 style="margin: 0 0 10px; color: #ffdc86; font-size: 15px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">
                  📍 EVENT SCHEDULE & VENUE
                </h3>
                <p style="margin: 0 0 6px; color: #ffffff; font-size: 14px; font-weight: bold;">
                  🗓️ Dates: 24th & 25th September 2026 (24 Hours Continuous Build)
                </p>
                <p style="margin: 0 0 6px; color: #d0e2ff; font-size: 13px; line-height: 1.5;">
                  🏛️ <strong>Venue:</strong> Erode Sengunthar Engineering College, Thuduppathi, Perundurai, Erode – 638 057
                </p>
                <p style="margin: 0; color: #94bcf8; font-size: 12px;">
                  Free college bus transport is available across 40+ regional routes in Erode, Tirupur, Coimbatore, and Salem.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- WhatsApp Community CTA Button -->
      <tr>
        <td style="padding: 10px 24px 28px; text-align: center;">
          <a href="${whatsappCommunityUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background: #25d366; color: #041408; font-family: 'Arial', sans-serif; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 8px; box-shadow: 0 6px 20px rgba(37,211,102,0.4); text-transform: uppercase; letter-spacing: 0.5px;">
            JOIN OFFICIAL WHATSAPP COMMUNITY &rarr;
          </a>
          <span style="display: block; margin-top: 10px; color: #94bcf8; font-size: 12px;">
            Get real-time announcements, problem statement releases, and mentor schedules.
          </span>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 20px 24px; background: #040c1e; border-top: 1px solid rgba(98,185,255,0.2); text-align: center;">
          <p style="margin: 0 0 6px; color: #ffffff; font-size: 13px; font-weight: bold;">
            InnoHack-26 · 24-Hour National Level Hackathon
          </p>
          <p style="margin: 0; color: #6e88b5; font-size: 11px; line-height: 1.5;">
            Presented by Mechanical Engineering, Robotics & Automation, and EIE Departments<br/>
            Erode Sengunthar Engineering College, Perundurai.
          </p>
        </td>
      </tr>

    </table>
  </center>
</body>
</html>
  `.trim();
}

export function renderRegistrationEmailText(data: RegistrationEmailData): string {
  const siteUrl = (data.siteUrl || process.env.SITE_URL || "https://innohack26.vercel.app").replace(/\/$/, "");
  const totalFormatted = `₹${data.amountPaid}`;
  
  const tokens = data.foodTokens && data.foodTokens.length > 0 
    ? data.foodTokens 
    : generateFoodTokens(data.referenceCode, data.members, siteUrl);

  const passesText = tokens
    .map(
      (t) => `
PASS #${t.memberIndex}: ${t.memberName} (${t.role})
Token ID: ${t.tokenId}
Digital Pass URL: ${t.scanUrl}
Meals Included: 
  - 24th Sep Morning Snacks & Tea
  - 24th Sep Night Hackathon Feast (Dinner)
  - 24th Sep Night Midnight Snacks
  - 25th Sep Morning Breakfast
  - 25th Sep Morning Snacks
  - 25th Sep Afternoon High Tea
`
    )
    .join("\n----------------------------------------\n");

  return `
============================================================
INNOHACK-26: REGISTRATION CONFIRMED
============================================================

Dear ${data.leadName},

Your squad "${data.teamName}" has been successfully registered for InnoHack-26!

REFERENCE CODE: ${data.referenceCode}

SQUAD & PAYMENT DETAILS:
----------------------------------------
- Team Name: ${data.teamName}
- Team Lead: ${data.leadName}
- College: ${data.college}
- Innovation Domain: ${data.domain}
- Build Track: ${data.buildType.toUpperCase()} BUILD
- Squad Size: ${data.memberCount} Participants (${data.members.join(", ")})
- Fee Rate: ₹500 / participant
- Total Fee Calculation: ${data.memberCount} × ₹500 = ${totalFormatted}
- Transaction ID / UTR: ${data.transactionId}
- Status: VERIFIED / RECORDED

INDIVIDUAL FOOD & SNACKS TOKENS (${tokens.length} PASSES ISSUED):
----------------------------------------
${passesText}

EVENT SCHEDULE & VENUE:
----------------------------------------
Dates: 24th & 25th September 2026 (24-Hour Continuous Hackathon)
Venue: Erode Sengunthar Engineering College, Thuduppathi, Perundurai, Erode - 638 057

WHATSAPP COMMUNITY ACCESS:
https://chat.whatsapp.com/CFnmH4QfqFo3ijpJb76fGe?mode=gi_t

For queries, contact the organizing committee at Erode Sengunthar Engineering College.
============================================================
`.trim();
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
