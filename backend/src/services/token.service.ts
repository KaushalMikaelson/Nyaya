import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { UserRole, VerificationStatus } from '@prisma/client';

// ─────────────────────────────────────────
// SECRETS
// ─────────────────────────────────────────

export const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'nyaya-access-secret-CHANGE-IN-PROD';
export const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'nyaya-refresh-secret-CHANGE-IN-PROD';

// ─────────────────────────────────────────
// TOKEN PAYLOAD TYPES
// ─────────────────────────────────────────

export interface AccessTokenPayload {
  userId: string;
  email: string | null;
  role: UserRole;
  isPro: boolean;
  isEmailVerified: boolean;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string; // DB row ID for rotation
}

// ─────────────────────────────────────────
// TOKEN GENERATION
// ─────────────────────────────────────────

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}

// ─────────────────────────────────────────
// ISSUE TOKEN PAIR + STORE REFRESH IN DB
// ─────────────────────────────────────────

export async function issueTokenPair(
  userId: string,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<{ accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isPro: true,
      isEmailVerified: true,
    },
  });

  // Store refresh token in DB (rotation-ready)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const dbToken = await prisma.refreshToken.create({
    data: {
      userId,
      token: 'temp', // will update after we have the ID
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
      expiresAt,
    },
  });

  const refreshPayload: RefreshTokenPayload = {
    userId,
    tokenId: dbToken.id,
  };
  const refreshToken = signRefreshToken(refreshPayload);

  // Update the stored token with the real signed value
  await prisma.refreshToken.update({
    where: { id: dbToken.id },
    data: { token: refreshToken },
  });

  const accessPayload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    isPro: user.isPro,
    isEmailVerified: user.isEmailVerified,
  };

  return {
    accessToken: signAccessToken(accessPayload),
    refreshToken,
  };
}

// ─────────────────────────────────────────
// REFRESH TOKEN ROTATION
// ─────────────────────────────────────────

export async function rotateRefreshToken(
  oldToken: string,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: RefreshTokenPayload;
  try {
    payload = jwt.verify(oldToken, REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw new Error('Invalid or expired refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { id: payload.tokenId },
  });

  if (!stored || stored.revokedAt || stored.token !== oldToken) {
    // Possible token reuse — revoke ALL tokens for this user (security response)
    await prisma.refreshToken.updateMany({
      where: { userId: payload.userId },
      data: { revokedAt: new Date() },
    });
    throw new Error('Refresh token reuse detected. All sessions revoked.');
  }

  if (stored.expiresAt < new Date()) {
    throw new Error('Refresh token expired');
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  // Issue new pair
  return issueTokenPair(payload.userId, meta);
}

// ─────────────────────────────────────────
// REVOKE ALL REFRESH TOKENS (logout all)
// ─────────────────────────────────────────

export async function revokeAllTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ─────────────────────────────────────────
// REVOKE SINGLE TOKEN (logout this device)
// ─────────────────────────────────────────

export async function revokeSingleToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revokedAt: new Date() },
  });
}
