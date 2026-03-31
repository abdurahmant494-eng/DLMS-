const nodemailer = require('nodemailer');

// Create transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const emailService = {
  // Send welcome email to new users
  sendWelcomeEmail: async (to, data) => {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@dlms.borana.edu.et',
      to: to,
      subject: `Welcome to Borana University Digital Library, ${data.name}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Welcome to Borana University Digital Library!</h2>
          <p>Dear <strong>${data.name}</strong>,</p>
          <p>Your account has been successfully created with the following details:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>University ID:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${data.university_id}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Role:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${data.role}</td>
            </tr>
          </table>
          <p>You can now access the Digital Library Management System using your credentials.</p>
          <p>If you have any questions, please contact the library staff.</p>
          <br>
          <p>Best regards,<br>Borana University Library Team</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return info;
  },

  // Send password reset email
  sendPasswordResetEmail: async (to, data) => {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@dlms.borana.edu.et',
      to: to,
      subject: 'Password Reset Request - Borana University Library',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Password Reset Request</h2>
          <p>Dear <strong>${data.name}</strong>,</p>
          <p>You have requested to reset your password for the Digital Library Management System.</p>
          <p>Click the link below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetLink}" 
               style="background-color: #3498db; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; 
             border-left: 4px solid #3498db; word-break: break-all;">
            ${data.resetLink}
          </p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <br>
          <p>Best regards,<br>Borana University Library Team</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return info;
  },

  // Send password changed confirmation
  sendPasswordChangedEmail: async (to, data) => {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@dlms.borana.edu.et',
      to: to,
      subject: 'Password Changed - Borana University Library',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Password Successfully Changed</h2>
          <p>Dear <strong>${data.name}</strong>,</p>
          <p>Your password for the Digital Library Management System has been successfully changed.</p>
          <p>If you did not make this change, please contact the library staff immediately.</p>
          <br>
          <p>Best regards,<br>Borana University Library Team</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password changed email sent:', info.messageId);
    return info;
  },

  // Send test email
  sendTestEmail: async (to) => {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@dlms.borana.edu.et',
      to: to,
      subject: 'Test Email from DLMS',
      text: 'This is a test email from the Digital Library Management System.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Test Email</h2>
          <p>This is a test email from the Digital Library Management System.</p>
          <p>If you received this email, your email configuration is working correctly.</p>
          <br>
          <p>Best regards,<br>Borana University Library Team</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Test email sent:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };
  },

  // Send book due reminder
  sendDueDateReminder: async (to, data) => {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@dlms.borana.edu.et',
      to: to,
      subject: `Book Due Reminder: ${data.bookTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Book Due Date Reminder</h2>
          <p>Dear <strong>${data.userName}</strong>,</p>
          <p>This is a reminder that your borrowed book is due soon:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Book Title:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${data.bookTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Due Date:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${data.dueDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Days Remaining:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${data.daysRemaining} days</td>
            </tr>
          </table>
          <p>Please return the book on or before the due date to avoid late fees.</p>
          <br>
          <p>Best regards,<br>Borana University Library Team</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Due date reminder sent:', info.messageId);
    return info;
  }
};

module.exports = emailService;