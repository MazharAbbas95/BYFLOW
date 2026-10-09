import { prisma } from '../prisma/client';
import { WebSocket } from 'ws';

// In-memory registry of active WebSocket connections
interface ConnectedClient {
  userId: string;
  shopId?: string;
  ws: WebSocket;
}

const clients: ConnectedClient[] = [];

export const registerWebSocketClient = (ws: WebSocket, userId: string, shopId?: string) => {
  clients.push({ ws, userId, shopId });

  ws.on('close', () => {
    const index = clients.findIndex((c) => c.ws === ws);
    if (index !== -1) {
      clients.splice(index, 1);
    }
  });
};

export const broadcastToUser = (userId: string, data: any) => {
  clients
    .filter((c) => c.userId === userId && c.ws.readyState === WebSocket.OPEN)
    .forEach((c) => {
      try {
        c.ws.send(JSON.stringify(data));
      } catch (err) {
        console.error('Error broadcasting to user:', err);
      }
    });
};

export const broadcastToShop = (shopId: string, data: any) => {
  clients
    .filter((c) => c.shopId === shopId && c.ws.readyState === WebSocket.OPEN)
    .forEach((c) => {
      try {
        c.ws.send(JSON.stringify(data));
      } catch (err) {
        console.error('Error broadcasting to shop:', err);
      }
    });
};

export const createNotification = async (params: {
  userId: string;
  title: string;
  message: string;
  shopId?: string;
  bookingId?: string;
}) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        shopId: params.shopId,
        bookingId: params.bookingId,
      },
    });

    // Realtime push
    broadcastToUser(params.userId, {
      type: 'NOTIFICATION_NEW',
      notification,
    });

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};

export const notifyShopStaffByRole = async (
  shopId: string,
  roles: string[],
  title: string,
  message: string,
  bookingId?: string
) => {
  try {
    const members = await prisma.shopMember.findMany({
      where: {
        shopId,
        role: { in: roles },
        isActive: true,
      },
      select: { userId: true },
    });

    for (const member of members) {
      await createNotification({
        userId: member.userId,
        title,
        message,
        shopId,
        bookingId,
      });
    }
  } catch (error) {
    console.error('Failed to notify shop staff by role:', error);
  }
};
