
const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendEmail({ to, subject, text, html }) {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  let info = await transporter.sendMail({
    from: `"IEEE Event" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    text: text,
    html: html,
  });

  console.log('Message sent: %s', info.messageId);
  return info;
}

module.exports = { sendEmail };
