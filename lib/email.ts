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
export async function sendApprovalEmail(email: string, fullName: string): Promise<{ success: boolean; error?: string }> {
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

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send account rejection email
 */
export async function sendRejectionEmail(email: string, fullName: string, reason?: string): Promise<{ success: boolean; error?: string }> {
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

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send account ban email
 */
export async function sendBanEmail(email: string, fullName: string, reason?: string): Promise<{ success: boolean; error?: string }> {
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

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(email: string, fullName: string, role: string = 'student'): Promise<{ success: boolean; error?: string }> {
  const subject = 'Welcome to EduHub! 🎓'
  const roleMessage = role === 'instructor' 
    ? 'Your instructor account is pending approval. You will receive an email once your account is approved.'
    : 'Start exploring our courses and begin your learning journey today!'
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to EduHub! 🎓</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>Thank you for joining EduHub! We're excited to have you as part of our learning community.</p>
          <p>${roleMessage}</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/auth/login" class="button">
              Log In to Your Account
            </a>
          </p>
          <p>If you have any questions, our support team is here to help!</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send course enrollment email
 */
export async function sendEnrollmentEmail(email: string, fullName: string, courseTitle: string, courseId: string): Promise<{ success: boolean; error?: string }> {
  const subject = `You've Enrolled in "${courseTitle}" - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 Enrollment Successful!</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>Congratulations! You've successfully enrolled in <strong>"${courseTitle}"</strong>.</p>
          <p>You can now start learning at your own pace. Access all course materials, watch videos, and track your progress.</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/student/courses/${courseId}" class="button">
              Start Learning Now
            </a>
          </p>
          <p>Good luck with your learning journey!</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send course completion email
 */
export async function sendCourseCompletionEmail(email: string, fullName: string, courseTitle: string, courseId: string): Promise<{ success: boolean; error?: string }> {
  const subject = `🎉 Congratulations! You've Completed "${courseTitle}"`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Course Completed!</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>Congratulations! You've successfully completed <strong>"${courseTitle}"</strong>!</p>
          <p>This is a significant achievement. You've demonstrated dedication and commitment to your learning journey.</p>
          <p>You can now download your certificate of completion and share your achievement with others.</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/student/courses/${courseId}" class="button">
              View Certificate
            </a>
          </p>
          <p>Keep up the great work and continue learning!</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send certificate earned email
 */
export async function sendCertificateEmail(email: string, fullName: string, courseTitle: string, certificateNumber: string): Promise<{ success: boolean; error?: string }> {
  const subject = `🏆 Your Certificate for "${courseTitle}" is Ready!`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%); color: #333; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #ff8c00; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .cert-number { background-color: #fff; padding: 10px; border-radius: 5px; margin: 15px 0; font-family: monospace; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏆 Certificate Earned!</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>Congratulations! You've earned a certificate of completion for <strong>"${courseTitle}"</strong>.</p>
          <p>Your certificate number is:</p>
          <div class="cert-number">${certificateNumber}</div>
          <p>You can download and share your certificate to showcase your achievement on LinkedIn, your resume, or social media.</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/certificates/${certificateNumber}" class="button">
              View & Download Certificate
            </a>
          </p>
          <p>Well done on completing the course!</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send unban email (when admin unbans a user)
 */
export async function sendUnbanEmail(email: string, fullName: string): Promise<{ success: boolean; error?: string }> {
  const subject = 'Account Access Restored - EduHub'
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
          <h1>✅ Account Access Restored</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>Good news! Your account access on EduHub has been restored by our admin team.</p>
          <p>You can now log in and resume using our platform. We're glad to have you back!</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/auth/login" class="button">
              Log In to Your Account
            </a>
          </p>
          <p>If you have any questions or concerns, please don't hesitate to contact our support team.</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}


/**
 * Send payment receipt email
 */
export async function sendPaymentReceiptEmail(
  email: string,
  fullName: string,
  amount: number,
  currency: string,
  productName: string,
  productType: 'course' | 'book',
  productId: string,
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Payment Receipt - ${productName} - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .receipt-box { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #ddd; }
        .receipt-item { display: flex; justify-content: space-between; margin: 10px 0; }
        .receipt-total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #2196F3; padding-top: 10px; margin-top: 10px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Payment Receipt</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>Thank you for your purchase! Your payment has been processed successfully.</p>
          <div class="receipt-box">
            <div class="receipt-item">
              <span><strong>Item:</strong></span>
              <span>${productName}</span>
            </div>
            <div class="receipt-item">
              <span><strong>Type:</strong></span>
              <span>${productType === 'course' ? 'Course' : 'Book'}</span>
            </div>
            <div class="receipt-item receipt-total">
              <span><strong>Amount Paid:</strong></span>
              <span>${currency.toUpperCase()} ${amount.toFixed(2)}</span>
            </div>
            <div class="receipt-item" style="font-size: 0.9em; color: #666; margin-top: 10px;">
              <span>Payment ID:</span>
              <span>${paymentId}</span>
            </div>
          </div>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/${productType === 'course' ? 'student/courses' : 'books'}/${productId}" class="button">
              Access ${productType === 'course' ? 'Course' : 'Book'}
            </a>
          </p>
          <p>This receipt has been sent to your email for your records.</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send subscription renewal email
 */
export async function sendSubscriptionRenewalEmail(
  email: string,
  fullName: string,
  productName: string,
  amount: number,
  currency: string,
  nextBillingDate: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Subscription Renewed - ${productName} - EduHub`
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
        .info-box { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #4CAF50; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Subscription Renewed</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>Your subscription for <strong>${productName}</strong> has been successfully renewed!</p>
          <div class="info-box">
            <p><strong>Amount Charged:</strong> ${currency.toUpperCase()} ${amount.toFixed(2)}</p>
            <p><strong>Next Billing Date:</strong> ${new Date(nextBillingDate).toLocaleDateString()}</p>
          </div>
          <p>Your subscription remains active and you can continue enjoying all the benefits.</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/settings/subscriptions" class="button">
              Manage Subscription
            </a>
          </p>
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send subscription expiring email
 */
export async function sendSubscriptionExpiringEmail(
  email: string,
  fullName: string,
  productName: string,
  expiryDate: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Your Subscription Expires Soon - ${productName} - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .warning-box { background-color: #FFF3CD; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #FF9800; }
        .button { display: inline-block; padding: 12px 24px; background-color: #FF9800; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Subscription Expiring Soon</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>This is a reminder that your subscription for <strong>${productName}</strong> will expire soon.</p>
          <div class="warning-box">
            <p><strong>Expiry Date:</strong> ${new Date(expiryDate).toLocaleDateString()}</p>
            <p>To continue enjoying uninterrupted access, please renew your subscription before it expires.</p>
          </div>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/settings/subscriptions" class="button">
              Renew Subscription
            </a>
          </p>
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(
  email: string,
  fullName: string,
  productName: string,
  amount: number,
  currency: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Payment Failed - ${productName} - EduHub`
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
        .error-box { background-color: #FFEBEE; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f44336; }
        .button { display: inline-block; padding: 12px 24px; background-color: #f44336; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Payment Failed</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>We were unable to process your payment for <strong>${productName}</strong>.</p>
          <div class="error-box">
            <p><strong>Amount:</strong> ${currency.toUpperCase()} ${amount.toFixed(2)}</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
          <p>This could be due to:</p>
          <ul>
            <li>Insufficient funds</li>
            <li>Expired payment method</li>
            <li>Card declined by your bank</li>
          </ul>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/settings/payment" class="button">
              Update Payment Method
            </a>
          </p>
          <p>Please update your payment method to continue your subscription. If you continue to experience issues, please contact our support team.</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send subscription cancelled email
 */
export async function sendSubscriptionCancelledEmail(
  email: string,
  fullName: string,
  productName: string,
  accessUntil: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Subscription Cancelled - ${productName} - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #9E9E9E; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .info-box { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #9E9E9E; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Subscription Cancelled</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>Your subscription for <strong>${productName}</strong> has been cancelled as requested.</p>
          <div class="info-box">
            <p><strong>Access Until:</strong> ${new Date(accessUntil).toLocaleDateString()}</p>
            <p>You will continue to have access until the end of your current billing period.</p>
          </div>
          <p>We're sorry to see you go! If you change your mind, you can reactivate your subscription at any time.</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/settings/subscriptions" class="button">
              Reactivate Subscription
            </a>
          </p>
          <p>If you have any feedback about how we can improve, we'd love to hear from you.</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send new student enrolled email (to instructor)
 */
export async function sendNewStudentEnrolledEmail(
  email: string,
  instructorName: string,
  studentName: string,
  courseTitle: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `New Student Enrolled in "${courseTitle}" - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 New Student Enrolled!</h1>
        </div>
        <div class="content">
          <p>Hello ${instructorName || 'there'},</p>
          <p>Great news! <strong>${studentName}</strong> has just enrolled in your course <strong>"${courseTitle}"</strong>.</p>
          <p>Your course is helping students learn and grow. Keep up the excellent work!</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/instructor/courses/${courseId}" class="button">
              View Course Details
            </a>
          </p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send student completed course email (to instructor)
 */
export async function sendStudentCompletedCourseEmail(
  email: string,
  instructorName: string,
  studentName: string,
  courseTitle: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Student Completed "${courseTitle}" - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Student Completed Your Course!</h1>
        </div>
        <div class="content">
          <p>Hello ${instructorName || 'there'},</p>
          <p>Congratulations! <strong>${studentName}</strong> has successfully completed your course <strong>"${courseTitle}"</strong>.</p>
          <p>This is a testament to the quality of your teaching and course content. Your students are achieving their learning goals!</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/instructor/courses/${courseId}" class="button">
              View Course Analytics
            </a>
          </p>
          <p>Keep inspiring and educating!</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send payment received email (to instructor)
 */
export async function sendPaymentReceivedEmail(
  email: string,
  instructorName: string,
  amount: number,
  currency: string,
  productName: string,
  productType: 'course' | 'book',
  earnings: number
): Promise<{ success: boolean; error?: string }> {
  const subject = `Payment Received - ${productName} - EduHub`
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
        .payment-box { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #ddd; }
        .payment-item { display: flex; justify-content: space-between; margin: 10px 0; }
        .payment-total { font-weight: bold; font-size: 1.3em; color: #4CAF50; border-top: 2px solid #4CAF50; padding-top: 10px; margin-top: 10px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Payment Received!</h1>
        </div>
        <div class="content">
          <p>Hello ${instructorName || 'there'},</p>
          <p>Great news! You've received a payment for your ${productType === 'course' ? 'course' : 'book'} <strong>"${productName}"</strong>.</p>
          <div class="payment-box">
            <div class="payment-item">
              <span>Total Sale:</span>
              <span>${currency.toUpperCase()} ${amount.toFixed(2)}</span>
            </div>
            <div class="payment-item">
              <span>Platform Fee (20%):</span>
              <span>${currency.toUpperCase()} ${(amount * 0.2).toFixed(2)}</span>
            </div>
            <div class="payment-item payment-total">
              <span>Your Earnings:</span>
              <span>${currency.toUpperCase()} ${earnings.toFixed(2)}</span>
            </div>
          </div>
          <p>Your earnings will be processed according to your payout schedule.</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/instructor/earnings" class="button">
              View Earnings Dashboard
            </a>
          </p>
          <p>Thank you for creating amazing content on EduHub!</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send meeting reminder email
 */
export async function sendMeetingReminderEmail(
  email: string,
  fullName: string,
  meetingTitle: string,
  meetingDate: string,
  meetingTime: string,
  meetingUrl: string,
  meetingId: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Meeting Reminder: ${meetingTitle} - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #9C27B0; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .meeting-box { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #9C27B0; }
        .button { display: inline-block; padding: 12px 24px; background-color: #9C27B0; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 Meeting Reminder</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>This is a reminder that you have a meeting scheduled:</p>
          <div class="meeting-box">
            <p><strong>Meeting:</strong> ${meetingTitle}</p>
            <p><strong>Date:</strong> ${new Date(meetingDate).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${meetingTime}</p>
          </div>
          <p>We look forward to seeing you there!</p>
          <p>
            <a href="${meetingUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/student/meetings/${meetingId}`}" class="button">
              Join Meeting
            </a>
          </p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send meeting cancelled email
 */
export async function sendMeetingCancelledEmail(
  email: string,
  fullName: string,
  meetingTitle: string,
  meetingDate: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Meeting Cancelled: ${meetingTitle} - EduHub`
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
        .info-box { background-color: #FFEBEE; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f44336; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Meeting Cancelled</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>We're sorry to inform you that the following meeting has been cancelled:</p>
          <div class="info-box">
            <p><strong>Meeting:</strong> ${meetingTitle}</p>
            <p><strong>Date:</strong> ${new Date(meetingDate).toLocaleDateString()}</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
          <p>We apologize for any inconvenience this may cause. If you have any questions, please contact the instructor or our support team.</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send meeting recording available email
 */
export async function sendMeetingRecordingEmail(
  email: string,
  fullName: string,
  meetingTitle: string,
  recordingUrl: string,
  meetingId: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Recording Available: ${meetingTitle} - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎥 Recording Available</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>The recording for the meeting <strong>"${meetingTitle}"</strong> is now available!</p>
          <p>You can watch it at your convenience to review the content or catch up if you missed the live session.</p>
          <p>
            <a href="${recordingUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/student/meetings/${meetingId}`}" class="button">
              Watch Recording
            </a>
          </p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send forum reply email
 */
export async function sendForumReplyEmail(
  email: string,
  fullName: string,
  postTitle: string,
  replyAuthor: string,
  replyContent: string,
  forumId: string,
  postId: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `New Reply to Your Post: "${postTitle}" - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .reply-box { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #FF9800; }
        .button { display: inline-block; padding: 12px 24px; background-color: #FF9800; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💬 New Reply to Your Post</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p><strong>${replyAuthor}</strong> has replied to your forum post <strong>"${postTitle}"</strong>.</p>
          <div class="reply-box">
            <p><strong>Reply:</strong></p>
            <p>${replyContent.substring(0, 200)}${replyContent.length > 200 ? '...' : ''}</p>
          </div>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/student/forums/${forumId}" class="button">
              View Reply
            </a>
          </p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send new lesson added email
 */
export async function sendNewLessonAddedEmail(
  email: string,
  fullName: string,
  courseTitle: string,
  lessonTitle: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `New Lesson Added to "${courseTitle}" - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #00BCD4; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #00BCD4; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 New Lesson Available!</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>Great news! A new lesson has been added to the course <strong>"${courseTitle}"</strong>.</p>
          <p><strong>New Lesson:</strong> ${lessonTitle}</p>
          <p>Continue your learning journey and check out the new content!</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/student/courses/${courseId}" class="button">
              View New Lesson
            </a>
          </p>
          <p>Happy learning!</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send course published email
 */
export async function sendCoursePublishedEmail(
  email: string,
  fullName: string,
  courseTitle: string,
  courseId: string,
  instructorName: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `New Course Published: "${courseTitle}" - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 New Course Published!</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>A new course has been published that might interest you!</p>
          <p><strong>Course:</strong> ${courseTitle}</p>
          <p><strong>Instructor:</strong> ${instructorName}</p>
          <p>Check it out and start learning something new today!</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/courses/${courseId}" class="button">
              View Course
            </a>
          </p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send weekly progress report email
 */
export async function sendWeeklyProgressReportEmail(
  email: string,
  fullName: string,
  stats: {
    coursesCompleted: number
    lessonsCompleted: number
    certificatesEarned: number
    timeSpent: number
    coursesInProgress: number
  }
): Promise<{ success: boolean; error?: string }> {
  const subject = `Your Weekly Learning Progress - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .stat-box { background-color: white; padding: 15px; border-radius: 5px; text-align: center; border: 1px solid #ddd; }
        .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; font-size: 0.9em; margin-top: 5px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Your Weekly Progress</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>Here's a summary of your learning activity this week:</p>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-number">${stats.coursesCompleted}</div>
              <div class="stat-label">Courses Completed</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">${stats.lessonsCompleted}</div>
              <div class="stat-label">Lessons Completed</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">${stats.certificatesEarned}</div>
              <div class="stat-label">Certificates Earned</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">${Math.round(stats.timeSpent / 60)}h</div>
              <div class="stat-label">Hours Studied</div>
            </div>
          </div>
          <p>You have <strong>${stats.coursesInProgress}</strong> course(s) in progress. Keep up the great work!</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/student/dashboard" class="button">
              View Dashboard
            </a>
          </p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send course reminder email
 */
export async function sendCourseReminderEmail(
  email: string,
  fullName: string,
  courseTitle: string,
  courseId: string,
  daysInactive: number
): Promise<{ success: boolean; error?: string }> {
  const subject = `Continue Learning: "${courseTitle}" - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #FF9800; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 Continue Your Learning</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>We noticed you haven't continued learning in <strong>"${courseTitle}"</strong> for ${daysInactive} day(s).</p>
          <p>Don't let your progress slip away! Pick up where you left off and continue your learning journey.</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/student/courses/${courseId}" class="button">
              Continue Learning
            </a>
          </p>
          <p>Every step forward counts. You've got this!</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send course recommendations email
 */
export async function sendCourseRecommendationsEmail(
  email: string,
  fullName: string,
  courses: Array<{ id: string; title: string; instructor: string; price: number }>
): Promise<{ success: boolean; error?: string }> {
  const subject = `Recommended Courses for You - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .course-item { background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #667eea; }
        .button { display: inline-block; padding: 12px 24px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎯 Recommended for You</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>Based on your interests and learning history, we think you might enjoy these courses:</p>
          ${courses.map(course => `
            <div class="course-item">
              <p><strong>${course.title}</strong></p>
              <p style="color: #666; font-size: 0.9em;">by ${course.instructor} ${course.price > 0 ? `- $${course.price}` : '- Free'}</p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/courses/${course.id}" style="color: #667eea; text-decoration: none;">View Course →</a>
            </div>
          `).join('')}
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/courses" class="button">
              Browse All Courses
            </a>
          </p>
          <p>Happy learning!</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send login from new device email
 */
export async function sendNewDeviceLoginEmail(
  email: string,
  fullName: string,
  deviceInfo: string,
  location: string,
  loginTime: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `New Device Login Detected - EduHub`
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .security-box { background-color: #FFF3CD; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #FF9800; }
        .button { display: inline-block; padding: 12px 24px; background-color: #f44336; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 New Device Login</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>We detected a login to your account from a new device.</p>
          <div class="security-box">
            <p><strong>Device:</strong> ${deviceInfo}</p>
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>Time:</strong> ${new Date(loginTime).toLocaleString()}</p>
          </div>
          <p>If this was you, no action is needed. If you don't recognize this activity, please secure your account immediately.</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/settings/security" class="button">
              Secure My Account
            </a>
          </p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}

/**
 * Send password changed email
 */
export async function sendPasswordChangedEmail(
  email: string,
  fullName: string,
  changeTime: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Password Changed Successfully - EduHub`
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
        .info-box { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #4CAF50; }
        .button { display: inline-block; padding: 12px 24px; background-color: #f44336; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Password Changed</h1>
        </div>
        <div class="content">
          <p>Hello ${fullName || 'there'},</p>
          <p>Your password has been successfully changed.</p>
          <div class="info-box">
            <p><strong>Changed at:</strong> ${new Date(changeTime).toLocaleString()}</p>
          </div>
          <p>If you didn't make this change, please secure your account immediately by resetting your password.</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub-tn.netlify.app'}/auth/reset-password" class="button">
              Reset Password
            </a>
          </p>
          <p>For security reasons, if you didn't make this change, please contact our support team right away.</p>
          <p>Best regards,<br>The EduHub Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({ to: email, subject, html })
}
