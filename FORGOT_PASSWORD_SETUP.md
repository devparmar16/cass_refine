# Forgot Password Setup Instructions

## Overview
The forgot password functionality has been implemented with the following flow:
1. User clicks "Reset" on login page
2. User enters their email address
3. System sends OTP to the email
4. User enters the 6-digit OTP
5. User sets new password
6. Password is updated in the database

## Setup Steps

### 1. Configure Email Settings
Edit `config.js` and update the email configuration:

```javascript
export const emailConfig = {
  service: 'gmail',
  auth: {
    user: 'your-actual-email@gmail.com', // Your Gmail address
    pass: 'your-app-password' // Your Gmail app password
  }
};
```

### 2. Gmail App Password Setup
To use Gmail for sending emails, you need to:

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in the config file

### 3. Database Requirements
Ensure your `login` table has an `email` column. The system will:
- Check if the email exists in the login table
- Update the password for the matching email

### 4. Start the Server
Make sure both the frontend and backend are running:

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
node server.js
```

## API Endpoints

### POST /api/forgot-password
- **Body**: `{ "email": "user@example.com" }`
- **Response**: `{ "success": true, "message": "OTP sent to your email", "email": "user@example.com" }`

### POST /api/reset-password
- **Body**: `{ "email": "user@example.com", "otp": "123456", "newPassword": "newpassword" }`
- **Response**: `{ "success": true, "message": "Password updated successfully" }`

## Security Features

1. **OTP Expiry**: OTPs expire after 10 minutes
2. **Email Validation**: Only emails registered in the login table can request password reset
3. **Password Validation**: New passwords must be at least 6 characters
4. **OTP Cleanup**: OTPs are automatically removed after use or expiry

## Frontend Routes

- `/login` - Main login page with "Reset" button
- `/forgot-password` - Forgot password flow

## Troubleshooting

### Email Not Sending
1. Check Gmail app password is correct
2. Ensure 2FA is enabled on Gmail
3. Check server logs for error messages

### OTP Not Working
1. Check if email exists in login table
2. Verify OTP hasn't expired (10 minutes)
3. Ensure OTP is exactly 6 digits

### Database Issues
1. Verify `login` table has `email` column
2. Check Supabase connection
3. Ensure proper permissions for password updates

## Production Considerations

1. **Use Environment Variables**: Store email credentials in `.env` file
2. **Use Redis/Database**: Store OTPs in database instead of memory
3. **Rate Limiting**: Implement rate limiting for OTP requests
4. **Email Templates**: Use professional email templates
5. **Logging**: Add proper logging for security monitoring 