import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import { prisma } from '../prisma';
import { getPythonRagUrl, getInternalRagHeaders } from '../services/retrieval';

const router = Router();

// Create new team
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = await (prisma as any).team.create({
      data: {
        name,
        description: description || null,
        members: {
          create: {
            userId: req.user!.userId,
            role: 'ADMIN'
          }
        }
      },
      include: { members: true }
    });

    res.status(201).json({ team });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create team', details: error.message });
  }
});

// List teams user belongs to
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const teams = await (prisma as any).team.findMany({
      where: {
        members: {
          some: { userId: req.user!.userId }
        }
      },
      include: {
        members: true,
        permissions: true
      }
    });

    res.json({ teams });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list teams', details: error.message });
  }
});

// Add member to team
router.post('/:teamId/members', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { teamId } = req.params;
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Verify requesting user is team admin
    const requester = await (prisma as any).teamMember.findFirst({
      where: { teamId, userId: req.user!.userId, role: 'ADMIN' }
    });
    if (!requester && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only team admins can add members' });
    }

    const member = await (prisma as any).teamMember.create({
      data: {
        teamId,
        userId,
        role: role || 'MEMBER'
      }
    });

    res.status(201).json({ member });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add member', details: error.message });
  }
});

// Add permission to team
router.post('/:teamId/permissions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { teamId } = req.params;
    const { actId, sectionId, canRead, canWrite } = req.body;

    const perm = await (prisma as any).documentPermission.create({
      data: {
        teamId,
        actId: actId || null,
        sectionId: sectionId || null,
        canRead: canRead ?? true,
        canWrite: canWrite ?? false
      }
    });

    // Invalidate search cache so old permissions don't serve cached results
    try {
      const pyUrl = getPythonRagUrl();
      fetch(`${pyUrl}/cache/invalidate`, {
        method: 'POST',
        headers: getInternalRagHeaders(),
      }).catch((e) =>
        console.warn('[Cache] Non-fatal error invalidating search cache:', e.message)
      );
    } catch (cacheErr) {
      console.warn('[Cache] Could not reach RAG cache invalidator:', cacheErr);
    }

    res.status(201).json({ permission: perm });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add permission', details: error.message });
  }
});

// Delete permission from team
router.delete('/:teamId/permissions/:permissionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { teamId, permissionId } = req.params;

    // Verify requesting user is team admin
    const requester = await (prisma as any).teamMember.findFirst({
      where: { teamId, userId: req.user!.userId, role: 'ADMIN' }
    });
    if (!requester && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only team admins can delete permissions' });
    }

    await (prisma as any).documentPermission.delete({
      where: { id: permissionId }
    });

    // Invalidate search cache so revoked permissions immediately drop cached search results
    try {
      const pyUrl = getPythonRagUrl();
      fetch(`${pyUrl}/cache/invalidate`, {
        method: 'POST',
        headers: getInternalRagHeaders(),
      }).catch((e) =>
        console.warn('[Cache] Non-fatal error invalidating search cache on perm delete:', e.message)
      );
    } catch (cacheErr) {
      console.warn('[Cache] Could not reach RAG cache invalidator:', cacheErr);
    }

    res.json({ success: true, message: 'Permission deleted and cache invalidated' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete permission', details: error.message });
  }
});

export default router;
