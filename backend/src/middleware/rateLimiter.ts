import rateLimit from 'express-rate-limit';

// ─────────────────────────────────────────
// RATE LIMITERS — Auth Route Protection
// ─────────────────────────────────────────

/**
 * General rate limiter for all auth routes
 * 60 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Strict limiter for login attempts.
 * 10 attempts per 15 minutes per IP — brute-force protection
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Successful logins don't count
});

/**
 * OTP send limiter: 5 OTP requests per 10 minutes per IP
 * Prevents OTP spam / phone/email bombing
 */
export const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Too many OTP requests. Please wait 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * OTP verify limiter: 10 attempts per 5 minutes
 * Complements per-OTP attempt limits in otp.service
 */
export const otpVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { error: 'Too many OTP verification attempts. Please wait 5 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Registration limiter: 5 account creations per hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts from this IP. Please try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Password reset limiter: 3 resets per 30 minutes per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 3,
  message: { error: 'Too many password reset attempts. Please wait 30 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Token refresh limiter: 30 refreshes per 5 minutes
 * Prevents token refresh abuse
 */
export const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { error: 'Too many token refresh requests.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
