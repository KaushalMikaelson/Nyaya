import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../prisma';

export interface RBACRequest extends AuthRequest {
  userTeamIds?: string[];
}

/**
 * Middleware that loads team IDs the authenticated user belongs to.
 * Sets req.userTeamIds = ['team_1', 'team_2', ...]
 */
export const loadUserTeams = async (
  req: RBACRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user?.userId) {
    req.userTeamIds = [];
    return next();
  }

  try {
    const memberships = await (prisma as any).teamMember.findMany({
      where: { userId: req.user.userId },
      select: { teamId: true }
    });
    req.userTeamIds = memberships.map((m: any) => m.teamId);
    next();
  } catch (error) {
    // Fail gracefully: if team lookup fails, default to empty teams list (public only)
    req.userTeamIds = [];
    next();
  }
};
