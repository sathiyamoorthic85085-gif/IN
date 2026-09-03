import nodemailer from "nodemailer";
import {
  generateFoodTokens,
  RegistrationEmailData,
  renderRegistrationEmailHtml,
  renderRegistrationEmailText,
} from "./emailTemplate";

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
}

/**
 * Creates a nodemailer transport based on available environment variables
 */
function createEmailTransporter() {
  // 1. Dedicated Gmail App Password configuration
  const gmailUser = process.env.GMAIL_USER || process.env.GMAIL_EMAIL;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD;

  if (gmailUser && gmailPass) {
    return {
      transporter: nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser.trim(),
          pass: gmailPass.trim().replace(/\s+/g, ""), // App passwords often contain spaces
        },
      }),
      from: `"InnoHack-26 Registrations" <${gmailUser.trim()}>`,
      provider: "gmail",
    };
  }

  // 2. Custom SMTP Host configuration
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

  if (smtpHost && smtpUser && smtpPass) {
    return {
      transporter: nodemailer.createTransport({
        host: smtpHost.trim(),
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser.trim(),
          pass: smtpPass.trim(),
        },
      }),
      from: process.env.SMTP_FROM || `"InnoHack-26 Team" <${smtpUser.trim()}>`,
      provider: "smtp",
    };
  }

  return null;
}

/**
 * Sends the official InnoHack-26 registration confirmation email with
 * poster cover image, fee breakdown (₹500/head), and individual food & snacks tokens.
 */
export async function sendRegistrationConfirmationEmail(
  data: RegistrationEmailData
): Promise<EmailDispatchResult> {
  const siteUrl = (data.siteUrl || process.env.SITE_URL || "https://innohack26.vercel.app").replace(/\/$/, "");

  // Generate tokens if not provided
  if (!data.foodTokens || data.foodTokens.length === 0) {
    data.foodTokens = generateFoodTokens(data.referenceCode, data.members, siteUrl);
  }

  const htmlContent = renderRegistrationEmailHtml(data);
  const textContent = renderRegistrationEmailText(data);
  const subject = `🎉 InnoHack-26 Registration Confirmed | Ref: ${data.referenceCode} (Squad: ${data.teamName})`;

  const transportConfig = createEmailTransporter();

  // If Resend API key is provided
  if (!transportConfig && process.env.RESEND_API_KEY) {
    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "InnoHack-26 <onboarding@resend.dev>",
          to: [data.email],
          subject,
          html: htmlContent,
          text: textContent,
        }),
      });

      if (resendRes.ok) {
        const json = await resendRes.json();
        console.log(`[EmailService] Resend email dispatched to ${data.email}, id: ${json.id}`);
        return { success: true, messageId: json.id, provider: "resend" };
      }
      const errText = await resendRes.text();
      console.warn(`[EmailService] Resend returned ${resendRes.status}: ${errText}`);
    } catch (resendErr) {
      console.warn("[EmailService] Resend API error:", resendErr);
    }
  }

  if (transportConfig) {
    try {
      const info = await transportConfig.transporter.sendMail({
        from: transportConfig.from,
        to: data.email,
        subject,
        html: htmlContent,
        text: textContent,
      });

      console.log(
        `[EmailService] Confirmation email successfully sent via ${transportConfig.provider} to ${data.email}. MessageId: ${info.messageId}`
      );
      return {
        success: true,
        messageId: info.messageId,
        provider: transportConfig.provider,
      };
    } catch (sendError) {
      console.error("[EmailService] Failed to send email via nodemailer:", sendError);
      return {
        success: false,
        error: sendError instanceof Error ? sendError.message : String(sendError),
      };
    }
  }

  // Fallback info notice when server SMTP is unconfigured (Google Apps Script webhook handles Gmail natively)
  console.log(
    `[EmailService] Server SMTP not configured. Google Apps Script Webhook handles Gmail sending if deployed. (Target: ${data.email}, Ref: ${data.referenceCode})`
  );
  return {
    success: true,
    provider: "delegated_or_webhook",
  };
}
