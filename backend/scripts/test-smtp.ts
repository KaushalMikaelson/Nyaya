import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

console.log('─────────────────────────────────');
console.log('SMTP Config:');
console.log(`  Host : ${SMTP_HOST}`);
console.log(`  Port : ${SMTP_PORT}`);
console.log(`  User : ${SMTP_USER}`);
console.log(`  Pass : ${SMTP_PASS ? '✅ set (' + SMTP_PASS.length + ' chars)' : '❌ NOT SET'}`);
console.log('─────────────────────────────────');

if (!SMTP_USER || !SMTP_PASS) {
  console.error('❌ SMTP_USER or SMTP_PASS is missing in .env!');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // TLS via STARTTLS on port 587
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function run() {
  try {
    console.log('\n🔌 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection OK!\n');

    console.log('📧 Sending test email...');
    const info = await transporter.sendMail({
      from: `"Nyaya Legal" <${SMTP_USER}>`,
      to: SMTP_USER, // send to yourself
      subject: '✅ Nyaya SMTP Test - It works!',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#1a1a2e;color:#e2e8f0;border-radius:16px;">
          <h2 style="color:#818cf8;">⚖️ Nyaya SMTP Test</h2>
          <p>Your email configuration is working correctly!</p>
          <div style="background:#0f0f1a;border:2px dashed #6366f1;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
            <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#818cf8;font-family:monospace;">TEST OK</div>
          </div>
          <p style="color:#64748b;font-size:12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    console.log('✅ Email sent successfully!');
    console.log(`   Message ID : ${info.messageId}`);
    console.log(`   To         : ${SMTP_USER}`);
    console.log('\n📬 Check your inbox (and spam folder) for the test email.');
  } catch (err: any) {
    console.error('\n❌ SMTP Error:', err.message);
    if (err.code === 'EAUTH') {
      console.error('   → Authentication failed. Check your App Password is correct.');
      console.error('   → Make sure 2-Step Verification is ON for your Gmail account.');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('   → Could not connect to SMTP server. Check host/port.');
    }
    process.exit(1);
  }
}

run();
