import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { broadcastToUser, broadcastToShop } from '../services/notificationService';
import { handleAIFrontDeskInteraction } from '../services/aiFrontDeskService';

const router = Router();

// Initiate Call
router.post('/initiate', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId, shopId, receiverId } = req.body;
    const user = req.user!;

    if (!shopId || !receiverId) {
      res.status(400).json({ error: 'shopId and receiverId are required.' });
      return;
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      res.status(404).json({ error: 'Call recipient not found.' });
      return;
    }

    const callLog = await prisma.callLog.create({
      data: {
        bookingId: bookingId || null,
        shopId,
        callerId: user.id,
        receiverId,
        callerRole: user.role,
        receiverRole: receiver.role,
        status: 'RINGING',
        startedAt: new Date(),
      },
    });

    // Notify receiver via WebSocket
    broadcastToUser(receiverId, {
      type: 'INCOMING_CALL',
      call: {
        id: callLog.id,
        bookingId,
        shopId,
        callerId: user.id,
        callerName: user.name,
        callerRole: user.role,
      },
    });

    res.status(201).json({ call: callLog });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update / End Call
router.post('/:callId/end', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { callId } = req.params;
    const { status, durationSeconds } = req.body;

    const callLog = await prisma.callLog.update({
      where: { id: callId },
      data: {
        status: status || 'ENDED',
        durationSeconds: durationSeconds ? parseInt(durationSeconds) : 0,
        endedAt: new Date(),
      },
    });

    // Broadcast call ended
    broadcastToUser(callLog.callerId, { type: 'CALL_ENDED', callId });
    broadcastToUser(callLog.receiverId, { type: 'CALL_ENDED', callId });

    res.json({ success: true, call: callLog });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Call logs for booking
router.get('/bookings/:bookingId/calls', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const callLogs = await prisma.callLog.findMany({
      where: { bookingId },
      orderBy: { startedAt: 'desc' },
    });
    res.json({ callLogs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Front Desk: Interact
router.post('/ai-front-desk/interact', async (req, res): Promise<void> => {
  try {
    const { shopId, customerIdentifier, message, history } = req.body;
    if (!shopId || !message) {
      res.status(400).json({ error: 'shopId and message are required.' });
      return;
    }

    const result = await handleAIFrontDeskInteraction({
      shopId,
      customerIdentifier,
      message,
      history,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Front Desk: List Tasks for SA Dashboard
router.get('/shops/:shopId/ai-tasks', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shopId } = req.params;
    const tasks = await prisma.aIFronDeskTask.findMany({
      where: { shopId },
      include: {
        booking: {
          include: { vehicle: true, customer: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ tasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Front Desk: Toggle Task status (OPEN / DONE)
router.put('/shops/:shopId/ai-tasks/:taskId/toggle', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const task = await prisma.aIFronDeskTask.findUnique({ where: { id: taskId } });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const updated = await prisma.aIFronDeskTask.update({
      where: { id: taskId },
      data: {
        status: task.status === 'OPEN' ? 'DONE' : 'OPEN',
        completedAt: task.status === 'OPEN' ? new Date() : null,
      },
    });

    res.json({ task: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
