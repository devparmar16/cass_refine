import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';
import { supabase } from './server-supabase.js';
import { getEmailByRole } from './backend/services/roleEmailResolver.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Email configuration from environment variables
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

// Email transporter configuration
let transporter;
try {
  transporter = nodemailer.createTransport(emailConfig);
  console.log('Email transporter configured successfully');
} catch (error) {
  console.error('Email configuration error:', error);
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('Mock email sent:', mailOptions);
      return { messageId: 'mock-message-id' };
    }
  };
}

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Helper function to get sender email (chair email) using roleEmailResolver
async function getSenderEmail() {
  try {
    // Try to get chair email using common chair role labels
    const chairRoleVariations = ['Chair Person', 'chair', 'Chairperson', 'Chair'];
    
    for (const roleLabel of chairRoleVariations) {
      try {
        const chairEmail = await getEmailByRole(roleLabel, supabase);
        if (chairEmail) {
          console.log(`✅ Found chair email for role "${roleLabel}": ${chairEmail}`);
          return chairEmail;
        }
      } catch (err) {
        // Try next variation
        console.log(`⚠️ Chair role "${roleLabel}" not found, trying next...`);
      }
    }
    
    console.log('⚠️ No chair email found for any variation, falling back to env EMAIL_USER');
    return process.env.EMAIL_USER;
  } catch (err) {
    console.error('❌ Error getting sender email:', err);
    return process.env.EMAIL_USER;
  }
}

// Helper function to format date/time
function formatDateTime(date = new Date()) {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

// ============================================
// TASK REJECTION EMAIL ENDPOINT
// Sends email when any reviewer rejects a task
// ============================================
app.post('/api/email/task-rejected', async (req, res) => {
  const { 
    taskName,
    eventName,
    assignedToLabel,    // Original role label from tasks_temp.assigned_to_label
    reviewerRole,       // Role of the reviewer who rejected
    rejectionReason,    // Comment/reason for rejection
    recipientEmail      // Optional: direct email if already known
  } = req.body;
  
  console.log('Task rejection email request:', { taskName, eventName, assignedToLabel, reviewerRole });
  
  // Validate required fields
  if (!taskName || !eventName || !assignedToLabel || !reviewerRole) {
    return res.status(400).json({ 
      error: 'Missing required fields: taskName, eventName, assignedToLabel, reviewerRole' 
    });
  }

  try {
    // Get recipient email - either provided or resolve from role label
    let toEmail = recipientEmail;
    if (!toEmail) {
      toEmail = await getEmailByRole(assignedToLabel, supabase);
    }
    
    if (!toEmail) {
      console.error('Could not find email for role label:', assignedToLabel);
      return res.status(404).json({ error: 'Recipient email not found for the assigned role' });
    }

    // Use EMAIL_USER as sender (Gmail SMTP requires sending from authenticated account)
    const senderEmail = process.env.EMAIL_USER;
    console.log('Sending rejection email from:', senderEmail, 'to:', toEmail);

    const currentDateTime = formatDateTime();
    const reason = rejectionReason || 'No specific reason provided';

    const mailOptions = {
      from: senderEmail,
      to: toEmail,
      subject: `⚠️ Task Rejected: ${taskName} - Action Required`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #EF4444, #DC2626); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">E-CASS</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">IEEE Student Chapter</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin-bottom: 20px;">
              <h2 style="color: #DC2626; margin: 0 0 5px 0; font-size: 20px;">
                ❌ Task Rejected
              </h2>
              <p style="color: #991B1B; margin: 0; font-size: 14px;">
                Your task submission requires revision and re-upload.
              </p>
            </div>
            
            <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">Task Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; width: 120px;">Task Name:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600;">${taskName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B7280;">Event:</td>
                  <td style="padding: 8px 0; color: #111827;">${eventName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B7280;">Rejected By:</td>
                  <td style="padding: 8px 0; color: #111827;">${reviewerRole}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B7280;">Date & Time:</td>
                  <td style="padding: 8px 0; color: #111827;">${currentDateTime}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h4 style="color: #92400E; margin: 0 0 10px 0; font-size: 14px;">
                📝 Rejection Reason:
              </h4>
              <p style="color: #78350F; margin: 0; font-size: 14px; line-height: 1.6;">
                ${reason}
              </p>
            </div>
            
            <div style="background: #EFF6FF; border: 1px solid #3B82F6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h4 style="color: #1E40AF; margin: 0 0 10px 0; font-size: 14px;">
                🔄 Next Steps:
              </h4>
              <ol style="color: #1E3A8A; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                <li>Review the rejection feedback above</li>
                <li>Make the necessary corrections to your submission</li>
                <li>Log in to E-CASS and navigate to your task</li>
                <li><strong>Re-upload</strong> your revised submission</li>
              </ol>
            </div>
            
            <p style="color: #6B7280; font-size: 13px; text-align: center; margin-top: 20px;">
              Please address the feedback and re-upload your task at your earliest convenience.
            </p>
          </div>
          
          <div style="background: #F3F4F6; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
            <p style="color: #6B7280; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} E-CASS. IEEE Student Chapter. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    console.log('Sending rejection email to:', toEmail);
    await transporter.sendMail(mailOptions);
    console.log('Rejection email sent successfully');

    res.json({ 
      success: true, 
      message: 'Task rejection notification email sent successfully',
      recipient: toEmail
    });

  } catch (error) {
    console.error('Task rejection email error:', error);
    res.status(500).json({ error: 'Failed to send task rejection notification email' });
  }
});

// ============================================
// TASK ACCEPTED EMAIL ENDPOINT
// Sends email when final reviewer accepts a task
// ============================================
app.post('/api/email/task-accepted', async (req, res) => {
  console.log('Task acceptance email request - FULL BODY:', req.body);
  
  const { 
    taskName,
    eventName,
    assignedToLabel,    // Original role label from tasks_temp.assigned_to_label
    reviewerRole,       // Role of the final reviewer who accepted
    recipientEmail      // Optional: direct email if already known
  } = req.body;
  
  console.log('Task acceptance email request:', { taskName, eventName, assignedToLabel, reviewerRole });
  
  // Validate required fields
  if (!taskName || !eventName || !assignedToLabel || !reviewerRole) {
    return res.status(400).json({ 
      error: 'Missing required fields: taskName, eventName, assignedToLabel, reviewerRole' 
    });
  }

  try {
    // Get recipient email - either provided or resolve from role label
    let toEmail = recipientEmail;
    if (!toEmail) {
      toEmail = await getEmailByRole(assignedToLabel, supabase);
    }
    
    if (!toEmail) {
      console.error('Could not find email for role label:', assignedToLabel);
      return res.status(404).json({ error: 'Recipient email not found for the assigned role' });
    }

    // Use EMAIL_USER as sender (Gmail SMTP requires sending from authenticated account)
    const senderEmail = process.env.EMAIL_USER;
    console.log('Sending acceptance email from:', senderEmail, 'to:', toEmail);

    const currentDateTime = formatDateTime();

    const mailOptions = {
      from: senderEmail,
      to: toEmail,
      subject: `✅ Task Approved: ${taskName} - Congratulations!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">E-CASS</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">IEEE Student Chapter</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <div style="background: #ECFDF5; border-left: 4px solid #10B981; padding: 15px; margin-bottom: 20px;">
              <h2 style="color: #047857; margin: 0 0 5px 0; font-size: 20px;">
                ✅ Task Approved
              </h2>
              <p style="color: #065F46; margin: 0; font-size: 14px;">
                Congratulations! Your task has been approved by the final reviewer.
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px;">
              <div style="display: inline-block; background: #D1FAE5; border-radius: 50%; padding: 20px; margin-bottom: 15px;">
                <span style="font-size: 48px;">🎉</span>
              </div>
              <h3 style="color: #047857; margin: 0;">Great Work!</h3>
            </div>
            
            <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">Task Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; width: 140px;">Task Name:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600;">${taskName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B7280;">Event:</td>
                  <td style="padding: 8px 0; color: #111827;">${eventName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B7280;">Final Approval By:</td>
                  <td style="padding: 8px 0; color: #111827;">${reviewerRole}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B7280;">Date & Time:</td>
                  <td style="padding: 8px 0; color: #111827;">${currentDateTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B7280;">Status:</td>
                  <td style="padding: 8px 0;">
                    <span style="background: #10B981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                      COMPLETED
                    </span>
                  </td>
                </tr>
              </table>
            </div>
            
            <div style="background: #EFF6FF; border: 1px solid #3B82F6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="color: #1E40AF; margin: 0; font-size: 14px; line-height: 1.6;">
                <strong>📌 Note:</strong> Your task has passed all review stages and is now marked as completed. 
                No further action is required for this task. Thank you for your contribution!
              </p>
            </div>
            
            <p style="color: #6B7280; font-size: 13px; text-align: center; margin-top: 20px;">
              Keep up the excellent work! Your dedication to the team is appreciated.
            </p>
          </div>
          
          <div style="background: #F3F4F6; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
            <p style="color: #6B7280; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} E-CASS. IEEE Student Chapter. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    console.log('Sending acceptance email to:', toEmail);
    await transporter.sendMail(mailOptions);
    console.log('Acceptance email sent successfully');

    res.json({ 
      success: true, 
      message: 'Task acceptance notification email sent successfully',
      recipient: toEmail
    });

  } catch (error) {
    console.error('Task acceptance email error:', error);
    res.status(500).json({ error: 'Failed to send task acceptance notification email' });
  }
});

// ============================================
// FORGOT PASSWORD - OTP ENDPOINTS
// ============================================

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send forgot password email
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  console.log('Forgot password request for email:', email);
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Check if email exists in login table
    const { data: user, error } = await supabase
      .from('login')
      .select('username, role')
      .eq('email', email)
      .single();

    if (error || !user) {
      console.log('Email not found in database');
      return res.status(404).json({ error: 'Email not found in our records' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + (10 * 60 * 1000); // 10 minutes

    // Store OTP with expiry
    otpStore.set(email, {
      otp,
      expiry: otpExpiry,
      username: user.username,
      role: user.role
    });

    const mailOptions = {
      from: emailConfig.auth.user,
      to: email,
      subject: 'Password Reset OTP - E-CASS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1B55B9, #2563eb); color: white; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">E-CASS</h1>
            <p style="margin: 10px 0; opacity: 0.9;">IEEE Student Chapter</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #1B55B9; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              You have requested to reset your password for your E-CASS account.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="margin: 0; color: #666; font-size: 14px;">Your OTP Code</p>
              <h1 style="margin: 10px 0; color: #1B55B9; font-size: 32px; letter-spacing: 5px; font-weight: bold;">${otp}</h1>
              <p style="margin: 0; color: #dc3545; font-size: 12px;">Valid for 10 minutes</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1976d2; font-size: 14px;">
                <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} E-CASS. All rights reserved.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully');

    res.json({ 
      success: true, 
      message: 'OTP sent to your email',
      email: email
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send OTP email' });
  }
});

// Verify OTP and reset password
app.post('/api/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required' });
  }

  try {
    const storedData = otpStore.get(email);
    
    if (!storedData) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (Date.now() > storedData.expiry) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Update password in database
    const { error: updateError } = await supabase
      .from('login')
      .update({ password: newPassword })
      .eq('email', email);

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({ error: 'Failed to update password in database' });
    }

    // Remove OTP from store
    otpStore.delete(email);

    res.json({ 
      success: true, 
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change password endpoint (for logged-in users)
app.post('/api/change-password', async (req, res) => {
  const { email, newPassword } = req.body;
  
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required' });
  }

  try {
    const { data: user, error: checkError } = await supabase
      .from('login')
      .select('email, username, role')
      .eq('email', email)
      .single();

    if (checkError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error: updateError } = await supabase
      .from('login')
      .update({ password: newPassword })
      .eq('email', email);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update password in database' });
    }

    res.json({ 
      success: true, 
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Email configured with: ${emailConfig.auth.user}`);
  console.log('✅ Role-email cache ready (lazy loading on first query)');
}); 