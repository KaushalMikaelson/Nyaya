/**
 * Aadhaar eKYC Mock Service
 *
 * In production this would integrate with:
 *  - UIDAI Sandbox API at https://developer.uidai.gov.in
 *  - A licensed Authentication User Agency (AUA)
 *  - AES-256 + RSA session key encryption per UIDAI spec
 *
 * This mock simulates the full flow for development & testing.
 */

interface AadhaarVerifyResponse {
  success: boolean;
  maskedAadhaar?: string;   // e.g. "XXXX-XXXX-1234"
  name?: string;
  dateOfBirth?: string;     // ISO format
  gender?: string;
  address?: string;
  state?: string;
  pincode?: string;
  error?: string;
}

// ─── Mock user store (simulates UIDAI DB) ────────────────────────
const MOCK_AADHAAR_RECORDS: Record<string, {
  name: string;
  dob: string;
  gender: string;
  address: string;
  state: string;
  pincode: string;
  phone: string; // registered phone last 4 digits for OTP trigger
}> = {
  '999988887777': {
    name: 'Rahul Sharma',
    dob: '1990-05-15',
    gender: 'M',
    address: '12, MG Road, Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    phone: '7777',
  },
  '111122223333': {
    name: 'Priya Verma',
    dob: '1985-11-23',
    gender: 'F',
    address: '45, Lal Bahadur Shastri Nagar, Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226001',
    phone: '3333',
  },
  '444455556666': {
    name: 'Arjun Mehta',
    dob: '1978-03-09',
    gender: 'M',
    address: '7, Patel Nagar, New Delhi',
    state: 'Delhi',
    pincode: '110008',
    phone: '6666',
  },
};

// Temp store for initiated eKYC sessions (in prod: Redis with TTL)
const aadhaarSessions: Map<string, { aadhaarNumber: string; otp: string; expiresAt: Date }> = new Map();

/**
 * Step 1: Initiate Aadhaar OTP — triggers OTP to registered mobile
 * Returns a transaction ID to use in verification step.
 */
export async function initiateAadhaarOtp(aadhaarNumber: string): Promise<{
  success: boolean;
  txnId?: string;
  maskedPhone?: string;
  error?: string;
}> {
  const cleaned = aadhaarNumber.replace(/\s|-/g, '');

  // Basic Aadhaar format validation (12 digits, not starting with 0 or 1)
  if (!/^[2-9][0-9]{11}$/.test(cleaned)) {
    return { success: false, error: 'Invalid Aadhaar number format.' };
  }

  const record = MOCK_AADHAAR_RECORDS[cleaned];
  if (!record) {
    return {
      success: false,
      error: 'Aadhaar number not found in UIDAI records. (Use 999988887777 for testing)',
    };
  }

  // Generate mock OTP (in prod: UIDAI generates and sends to registered phone)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const txnId = `NYAYA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  aadhaarSessions.set(txnId, {
    aadhaarNumber: cleaned,
    otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  });

  const maskedPhone = `XXXXXXX${record.phone}`;

  // Log in dev (in prod: UIDAI sends SMS to actual registered phone)
  console.log(`[AADHAAR eKYC] TxnId: ${txnId} | OTP: ${otp} | Phone: ${maskedPhone}`);

  return { success: true, txnId, maskedPhone };
}

/**
 * Step 2: Verify Aadhaar OTP — returns eKYC data on success
 */
export async function verifyAadhaarOtp(
  txnId: string,
  otp: string
): Promise<AadhaarVerifyResponse> {
  const session = aadhaarSessions.get(txnId);

  if (!session) {
    return { success: false, error: 'Session expired or invalid. Please initiate again.' };
  }

  if (session.expiresAt < new Date()) {
    aadhaarSessions.delete(txnId);
    return { success: false, error: 'Aadhaar OTP expired. Please try again.' };
  }

  if (session.otp !== otp) {
    return { success: false, error: 'Invalid OTP. Please check and retry.' };
  }

  // OTP verified — clean up session
  aadhaarSessions.delete(txnId);

  const record = MOCK_AADHAAR_RECORDS[session.aadhaarNumber];
  if (!record) {
    return { success: false, error: 'eKYC data unavailable.' };
  }

  // Mask Aadhaar per UIDAI rules (show only last 4 digits)
  const maskedAadhaar = `XXXX-XXXX-${session.aadhaarNumber.slice(-4)}`;

  return {
    success: true,
    maskedAadhaar,
    name: record.name,
    dateOfBirth: record.dob,
    gender: record.gender,
    address: record.address,
    state: record.state,
    pincode: record.pincode,
  };
}
