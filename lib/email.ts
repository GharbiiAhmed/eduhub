import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send email using SMTP (configured in Supabase)
 * Uses the same SMTP settings you configured in Supabase Dashboard
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Get SMTP settings from environment variables
    // These should match your Supabase SMTP configuration
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
    const smtpPort = parseInt(process.env.SMTP_PORT || '587')
    const smtpUser = process.env.SMTP_USER || process.env.SMTP_USERNAME
    const smtpPassword = process.env.SMTP_PASSWORD
    const smtpFromEmail = process.env.SMTP_FROM_EMAIL || process.env.EMAIL_FROM || 'aghx01@gmail.com'
    const smtpFromName = process.env.SMTP_FROM_NAME || 'eduhub'

    if (!smtpUser || !smtpPassword) {
      console.error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables.')
      // Fallback: Log email for development
      console.log('📧 Email would be sent:', {
        to: options.to,
        subject: options.subject,
        from: `${smtpFromName} <${smtpFromEmail}>`,
        html: options.html.substring(0, 100) + '...',
      })
      return { success: false, error: 'SMTP credentials not configured' }
    }

    // Create transporter using SMTP settings
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    })

    // Send email
    const info = await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    })

    console.log('✅ Email sent successfully:', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error sending email:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

/**
 * Send account approval email
 */
export async function sendApprovalEmail(email: string, fullName: string): Promise<void> {
  const subject = 'Your Account Has Been Approved - EduHub'
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Account Approved!</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>Great news! Your instructor account on EduHub has been approved by our admin team.</p>
          <p>You can now log in and start creating courses, managing students, and building your teaching presence on our platform.</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/auth/login" class="button">
              Log In to Your Account
            </a>
          </p>
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          <p>Welcome to EduHub!</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({ to: email, subject, html })
}

/**
 * Send account rejection email
 */
export async function sendRejectionEmail(email: string, fullName: string, reason?: string): Promise<void> {
  const subject = 'Account Registration Update - EduHub'
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Account Registration Update</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>We regret to inform you that your instructor account registration on EduHub has not been approved at this time.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>If you believe this is an error or would like to appeal this decision, please contact our support team for further assistance.</p>
          <p>We appreciate your interest in EduHub and encourage you to reach out if you have any questions.</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({ to: email, subject, html })
}

/**
 * Send account ban email
 */
export async function sendBanEmail(email: string, fullName: string, reason?: string): Promise<void> {
  const subject = 'Account Suspension Notice - EduHub'
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Account Suspended</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>We are writing to inform you that your account on EduHub has been suspended (banned) by our admin team.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>As a result of this action, you will no longer be able to access your account or use our platform.</p>
          <p>If you believe this action was taken in error or would like to appeal this decision, please contact our support team immediately.</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({ to: email, subject, html })
}

