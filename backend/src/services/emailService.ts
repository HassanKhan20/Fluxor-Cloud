import nodemailer from 'nodemailer';

// Creates a Gmail SMTP transporter using an App Password.
// User must set GMAIL_USER and GMAIL_APP_PASSWORD in .env.
// To get an App Password: Google Account → Security → 2-Step Verification → App Passwords
function createTransporter() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) return null;

    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('[Email] GMAIL_USER or GMAIL_APP_PASSWORD not set — email sending disabled');
        return false;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    const from = process.env.GMAIL_USER;

    try {
        await transporter.sendMail({
            from: `"Fluxor Cloud" <${from}>`,
            to,
            subject: 'Reset your Fluxor Cloud password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #005CFF;">Reset your password</h2>
                    <p>We received a request to reset the password for your Fluxor Cloud account.</p>
                    <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
                    <a href="${resetUrl}"
                       style="display:inline-block;background:#005CFF;color:#fff;padding:12px 24px;
                              border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
                        Reset Password
                    </a>
                    <p style="color:#888;font-size:13px;">
                        If you did not request this, you can safely ignore this email.<br/>
                        This link will expire in 1 hour.
                    </p>
                    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
                    <p style="color:#aaa;font-size:12px;">Fluxor Cloud &mdash; Store Intelligence Platform</p>
                </div>
            `
        });
        return true;
    } catch (err) {
        console.error('[Email] Failed to send password reset email:', err);
        return false;
    }
}

export async function sendDemoRequestNotification(clientEmail: string, clientName?: string, storeName?: string): Promise<boolean> {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('[Email] Email not configured — demo request not forwarded');
        return false;
    }

    const adminEmail = process.env.GMAIL_USER;
    if (!adminEmail) return false;

    try {
        await transporter.sendMail({
            from: `"Fluxor Cloud" <${adminEmail}>`,
            to: adminEmail,
            subject: `New Demo Request from ${clientName || clientEmail}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #005CFF;">New Demo Request</h2>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr><td style="padding:8px 0;font-weight:bold;color:#555;">Email:</td><td style="padding:8px 0;">${clientEmail}</td></tr>
                        ${clientName ? `<tr><td style="padding:8px 0;font-weight:bold;color:#555;">Name:</td><td style="padding:8px 0;">${clientName}</td></tr>` : ''}
                        ${storeName ? `<tr><td style="padding:8px 0;font-weight:bold;color:#555;">Store:</td><td style="padding:8px 0;">${storeName}</td></tr>` : ''}
                        <tr><td style="padding:8px 0;font-weight:bold;color:#555;">Submitted:</td><td style="padding:8px 0;">${new Date().toLocaleString()}</td></tr>
                    </table>
                    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
                    <p style="color:#888;font-size:13px;">
                        To set them up, log in to your admin account and use the Create Client feature, or call<br/>
                        <code>POST /api/auth/create-client</code> with their details.
                    </p>
                </div>
            `
        });
        return true;
    } catch (err) {
        console.error('[Email] Failed to send demo request notification:', err);
        return false;
    }
}
