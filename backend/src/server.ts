import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';

import authRoutes from './routes/authRoutes';
import shopRoutes from './routes/shopRoutes';
import bookingRoutes from './routes/bookingRoutes';
import estimateRoutes from './routes/estimateRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import qcRoutes from './routes/qcRoutes';
import notificationRoutes from './routes/notificationRoutes';
import callRoutes from './routes/callRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import chatbotRoutes from './routes/chatbotRoutes';
import { registerWebSocketClient, broadcastToUser } from './services/notificationService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-shop-id'],
}));

app.use(express.json());

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/estimates', estimateRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/qc', qcRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calls', callRoutes);
app.use('/api', callRoutes); // For /api/ai-front-desk
app.use('/api/analytics', analyticsRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    app: 'BayFlow API & WebSocket Server',
    endpoints: {
      health: '/api/health',
      websocket: '/ws',
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'BayFlow API',
    timestamp: new Date().toISOString(),
  });
});

const server = http.createServer(app);

// Setup WebSocket server for real-time notifications and WebRTC call signaling
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket, req) => {
  let authenticatedUserId: string | null = null;
  let clientShopId: string | undefined = undefined;

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());

      // Client register identification
      if (data.type === 'REGISTER') {
        authenticatedUserId = data.userId;
        clientShopId = data.shopId;
        registerWebSocketClient(ws, data.userId, data.shopId);
        ws.send(JSON.stringify({ type: 'REGISTERED', status: 'connected' }));
      }

      // WebRTC Peer-to-Peer Signaling (Offer, Answer, ICE Candidate)
      if (['SIGNAL_OFFER', 'SIGNAL_ANSWER', 'SIGNAL_ICE'].includes(data.type)) {
        if (data.targetUserId) {
          broadcastToUser(data.targetUserId, {
            type: data.type,
            fromUserId: authenticatedUserId,
            payload: data.payload,
            callId: data.callId,
          });
        }
      }
    } catch (err) {
      console.error('WebSocket parse error:', err);
    }
  });
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 BayFlow API server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server listening on ws://localhost:${PORT}/ws`);
});

export { app, server };
