import { Resend } from "resend";

// ─── Resend Client ───────────────────────────────────────────────────
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Vault <noreply@position2.com>";

const APP_NAME = "Vault";
const APP_URL = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";

// ─── Shared Styles ──────────────────────────────────────────────────
const styles = {
  wrapper: `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  `,
  header: `
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    padding: 32px 40px;
    text-align: center;
    border-radius: 12px 12px 0 0;
  `,
  headerTitle: `
    color: #ffffff;
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.5px;
  `,
  headerSubtitle: `
    color: #94a3b8;
    font-size: 14px;
    margin: 8px 0 0 0;
    font-weight: 400;
  `,
  body: `
    padding: 40px;
    background-color: #ffffff;
  `,
  greeting: `
    font-size: 18px;
    font-weight: 600;
    color: #1a1a2e;
    margin: 0 0 16px 0;
  `,
  paragraph: `
    font-size: 15px;
    line-height: 1.6;
    color: #4a5568;
    margin: 0 0 20px 0;
  `,
  credentialBox: `
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 24px;
    margin: 24px 0;
  `,
  credentialLabel: `
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0 0 6px 0;
  `,
  credentialValue: `
    font-size: 16px;
    font-weight: 500;
    color: #1a1a2e;
    margin: 0 0 16px 0;
    padding: 10px 14px;
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', monospace;
  `,
  roleBadge: `
    display: inline-block;
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    margin: 0 0 8px 0;
  `,
  buttonContainer: `
    text-align: center;
    margin: 32px 0;
  `,
  button: `
    display: inline-block;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: #ffffff;
    padding: 14px 36px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 15px;
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
  `,
  securityTip: `
    background-color: #fef3c7;
    border: 1px solid #f59e0b;
    border-left: 4px solid #f59e0b;
    border-radius: 6px;
    padding: 14px 18px;
    margin: 24px 0 0 0;
    font-size: 13px;
    color: #92400e;
    line-height: 1.5;
  `,
  otpContainer: `
    text-align: center;
    margin: 28px 0;
  `,
  otpCode: `
    font-size: 36px;
    font-weight: 700;
    letter-spacing: 8px;
    color: #1a1a2e;
    background-color: #f1f5f9;
    border: 2px dashed #cbd5e1;
    border-radius: 12px;
    padding: 20px 32px;
    display: inline-block;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', monospace;
  `,
  divider: `
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 24px 0;
  `,
  footer: `
    padding: 24px 40px;
    background-color: #f8fafc;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    border-radius: 0 0 12px 12px;
  `,
  footerText: `
    font-size: 12px;
    color: #94a3b8;
    margin: 0 0 4px 0;
    line-height: 1.5;
  `,
  footerLink: `
    color: #2563eb;
    text-decoration: none;
  `,
};

// ─── Helper Functions ───────────────────────────────────────────────

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "superadmin":
      return "background-color: #fee2e2; color: #991b1b;";
    case "developer":
      return "background-color: #dbeafe; color: #1e40af;";
    default:
      return "background-color: #e0f2fe; color: #0369a1;";
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "superadmin":
      return "Super Admin";
    case "developer":
      return "Developer";
    default:
      return "User";
  }
}

function wrapInContainer(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${APP_NAME}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding: 40px 20px;">
        <tr>
          <td align="center">
            <div style="${styles.wrapper}; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">
              ${content}
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function buildFooter(): string {
  return `
    <div style="${styles.footer}">
      <p style="${styles.footerText}">&copy; ${new Date().getFullYear()} Position<sup>2</sup> Inc. All rights reserved.</p>
      <p style="${styles.footerText}">This is an automated message. Please do not reply to this email.</p>
      <p style="${styles.footerText}">
        <a href="${APP_URL}" style="${styles.footerLink}">Visit ${APP_NAME}</a>
      </p>
    </div>
  `;
}

// ─── Email Templates ────────────────────────────────────────────────

/**
 * Welcome / Invitation email — sent when a superadmin creates a new user.
 */
function buildWelcomeEmail(params: {
  name: string;
  email: string;
  password: string;
  role: string;
}): string {
  const { name, email, password, role } = params;
  const loginUrl = `${APP_URL}/auth/signin`;

  return wrapInContainer(`
    <!-- Header -->
    <div style="${styles.header}">
      <h1 style="${styles.headerTitle}">${APP_NAME} Invitation</h1>
      <p style="${styles.headerSubtitle}">Position² Project Management Invitation</p>
    </div>

    <!-- Body -->
    <div style="${styles.body}">
      <p style="${styles.greeting}">Hello ${name},</p>
      <p style="${styles.paragraph}">
        You have been invited to join the <strong>${APP_NAME}</strong> — Position²'s UI Component Management System.
        Your account has been created with the following credentials:
      </p>

      <!-- Role Badge -->
      <div style="margin: 0 0 20px 0;">
        <span style="${styles.roleBadge} ${getRoleBadgeColor(role)}">${getRoleLabel(role)}</span>
      </div>

      <!-- Credentials -->
      <div style="${styles.credentialBox}">
        <p style="${styles.credentialLabel}">Email Address</p>
        <p style="${styles.credentialValue}">${email}</p>
        <p style="${styles.credentialLabel}">Temporary Password</p>
        <p style="${styles.credentialValue}; margin-bottom: 0;">${password}</p>
      </div>

      <!-- CTA -->
      <div style="${styles.buttonContainer}">
        <a href="${loginUrl}" style="${styles.button}" target="_blank">Login to Dashboard</a>
      </div>

      <!-- Security Tip -->
      <div style="${styles.securityTip}">
        <strong>🔒 Security Tip:</strong> Please change your password after your first login to keep your account secure.
      </div>
    </div>

    <!-- Footer -->
    ${buildFooter()}
  `);
}

/**
 * Password Reset OTP email — sent when a user requests a password reset.
 */
function buildPasswordResetOTPEmail(params: {
  name?: string | null;
  otp: string;
}): string {
  const { name, otp } = params;
  const displayName = name || "there";

  return wrapInContainer(`
    <!-- Header -->
    <div style="${styles.header}">
      <h1 style="${styles.headerTitle}">${APP_NAME}</h1>
      <p style="${styles.headerSubtitle}">Password Reset Request</p>
    </div>

    <!-- Body -->
    <div style="${styles.body}">
      <p style="${styles.greeting}">Hello ${displayName},</p>
      <p style="${styles.paragraph}">
        We received a request to reset your password. Use the following One-Time Password (OTP) to verify your identity:
      </p>

      <!-- OTP Code -->
      <div style="${styles.otpContainer}">
        <div style="${styles.otpCode}">${otp}</div>
      </div>

      <p style="${styles.paragraph}; text-align: center; color: #64748b; font-size: 13px;">
        This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.
      </p>

      <hr style="${styles.divider}" />

      <p style="${styles.paragraph}; font-size: 13px; color: #94a3b8;">
        If you did not request a password reset, please ignore this email. Your account remains secure and no changes have been made.
      </p>
    </div>

    <!-- Footer -->
    ${buildFooter()}
  `);
}

/**
 * Password Reset Link email — alternative flow using a direct reset link.
 */
function buildPasswordResetLinkEmail(params: {
  name?: string | null;
  resetToken: string;
}): string {
  const { name, resetToken } = params;
  const displayName = name || "there";
  const resetUrl = `${APP_URL}/auth/reset-password/${resetToken}`;

  return wrapInContainer(`
    <!-- Header -->
    <div style="${styles.header}">
      <h1 style="${styles.headerTitle}">${APP_NAME}</h1>
      <p style="${styles.headerSubtitle}">Password Reset Request</p>
    </div>

    <!-- Body -->
    <div style="${styles.body}">
      <p style="${styles.greeting}">Hello ${displayName},</p>
      <p style="${styles.paragraph}">
        We received a request to reset your password. Click the button below to set a new password:
      </p>

      <!-- CTA -->
      <div style="${styles.buttonContainer}">
        <a href="${resetUrl}" style="${styles.button}" target="_blank">Reset Password</a>
      </div>

      <p style="${styles.paragraph}; text-align: center; color: #64748b; font-size: 13px;">
        This link is valid for <strong>15 minutes</strong>. If the button doesn't work, copy and paste this URL into your browser:
      </p>
      <p style="font-size: 12px; color: #2563eb; word-break: break-all; text-align: center; margin: 0 0 20px 0;">
        ${resetUrl}
      </p>

      <hr style="${styles.divider}" />

      <p style="${styles.paragraph}; font-size: 13px; color: #94a3b8;">
        If you did not request a password reset, please ignore this email. Your account remains secure and no changes have been made.
      </p>
    </div>

    <!-- Footer -->
    ${buildFooter()}
  `);
}

// ─── Email Sending Functions ────────────────────────────────────────

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Send a welcome / invitation email to a newly created user.
 */
export async function sendWelcomeEmail(params: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<SendEmailResult> {
  const html = buildWelcomeEmail(params);

  if (!resend) {
    console.warn("[Email] Resend API key not configured. Welcome email not sent.");
    console.log(`[Email] Would have sent welcome email to ${params.email}`);
    return { success: false, error: "Email service not configured" };
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.email,
      subject: `Welcome to ${APP_NAME} — Your Account is Ready`,
      html,
    });
    console.log(`[Email] ✅ Welcome email sent to ${params.email}`);
    return { success: true };
  } catch (error) {
    console.error("[Email] ❌ Failed to send welcome email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

/**
 * Send a password reset OTP email.
 *
 * IMPORTANT: For this to work for ALL users, the sending domain
 * (position2.com or whatever FROM_EMAIL uses) MUST be verified
 * in the Resend dashboard at https://resend.com/domains.
 *
 * Without a verified domain, Resend only delivers to the account
 * owner's email — which is why only YOU receive reset emails.
 */
export async function sendPasswordResetOTPEmail(params: {
  email: string;
  name?: string | null;
  otp: string;
}): Promise<SendEmailResult> {
  const html = buildPasswordResetOTPEmail({ name: params.name, otp: params.otp });

  if (!resend) {
    console.warn("[Email] ⚠️ Resend API key not configured. OTP email not sent.");
    console.log(`[Email] OTP for ${params.email}: ${params.otp}`);
    return { success: false, error: "Email service not configured. Set RESEND_API_KEY in your .env file." };
  }

  try {
    console.log(`[Email] Attempting to send OTP to ${params.email} from ${FROM_EMAIL}...`);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.email,
      subject: `${APP_NAME} — Password Reset OTP`,
      html,
    });
    console.log(`[Email] ✅ Password reset OTP sent to ${params.email} (id: ${result?.data?.id ?? "unknown"})`);
    return { success: true };
  } catch (error: unknown) {
    // Log full error details for debugging Resend issues
    console.error("[Email] ❌ Failed to send OTP email:", {
      to: params.email,
      from: FROM_EMAIL,
      error: error instanceof Error ? error.message : error,
      // Resend errors often have a statusCode property
      statusCode: (error as Record<string, unknown>)?.statusCode,
      name: error instanceof Error ? error.name : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

/**
 * Send a password reset link email (alternative to OTP).
 */
export async function sendPasswordResetLinkEmail(params: {
  email: string;
  name?: string | null;
  resetToken: string;
}): Promise<SendEmailResult> {
  const html = buildPasswordResetLinkEmail({
    name: params.name,
    resetToken: params.resetToken,
  });

  if (!resend) {
    console.warn("[Email] Resend API key not configured. Reset link email not sent.");
    console.log(`[Email] Reset link for ${params.email}: ${APP_URL}/auth/reset-password/${params.resetToken}`);
    return { success: false, error: "Email service not configured" };
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.email,
      subject: `${APP_NAME} — Password Reset Link`,
      html,
    });
    console.log(`[Email] ✅ Password reset link sent to ${params.email}`);
    return { success: true };
  } catch (error) {
    console.error("[Email] ❌ Failed to send reset link email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

