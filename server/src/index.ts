import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { apiRouter } from './routes/api';
import { store } from './db/store';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// REST API
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const server = http.createServer(app);

// WebSocket Server for live push notifications
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  // Send welcome ping
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Connected to ResQCity Live Telemetry Stream' }));
});

// Subscribe to store state events and broadcast to all connected WebSocket clients
store.subscribe((event) => {
  const payload = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[ResQCity Server] Running on http://localhost:${PORT}`);
  console.log(`[ResQCity Server] Live WebSocket streaming at ws://localhost:${PORT}/ws`);
});
