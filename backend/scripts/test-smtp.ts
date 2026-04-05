import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const t = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

t.verify().then(() => {
  console.log('✅ SMTP connection OK');
  return t.sendMail({
    from: `"Nyaya" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,
    subject: 'Nyaya SMTP Test',
    text: 'SMTP is working!',
  });
}).then(r => {
  console.log('✅ Email sent! MessageId:', r.messageId);
}).catch(e => {
  console.error('❌ SMTP Error:', e.message);
  process.exit(1);
});
