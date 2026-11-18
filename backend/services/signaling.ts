import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from '../utils/crypto.ts';
import { db } from '../config/db.ts';

interface PeerClient {
  ws: WebSocket;
  userId: number;
  role: string;
  name: string;
  roomId: string;
}

export function attachSignalingServer(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/signaling' });
  const rooms = new Map<string, Set<PeerClient>>();

  function broadcastToRoom(roomId: string, sender: PeerClient | null, payload: object) {
    const peers = rooms.get(roomId);
    if (!peers) return;
    const raw = JSON.stringify(payload);
    for (const peer of peers) {
      if (peer !== sender && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(raw);
      }
    }
  }

  wss.on('connection', async (ws, req) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const token = url.searchParams.get('token') || '';
      const roomId = url.searchParams.get('roomId') || '';

      if (!token || !roomId) {
        ws.close(4001, 'Missing token or roomId');
        return;
      }

      const decoded = verifyToken(token);

      const consult = await db.get<any>(
        `SELECT c.room_id, a.patient_id, d.user_id as doctor_user_id, u.full_name
         FROM consultations c
         JOIN appointments a ON a.id = c.appointment_id
         JOIN doctors d ON d.id = a.doctor_id
         JOIN users u ON u.id = ?
         WHERE c.room_id = ?`,
        [decoded.userId, roomId]
      );

      if (!consult) {
        ws.close(4004, 'Consultation room not found');
        return;
      }

      const authorized =
        decoded.role === 'admin' ||
        consult.patient_id === decoded.userId ||
        consult.doctor_user_id === decoded.userId;

      if (!authorized) {
        ws.close(4003, 'Not authorized for this consultation room');
        return;
      }

      const client: PeerClient = {
        ws,
        userId: decoded.userId,
        role: decoded.role,
        name: consult.full_name,
        roomId,
      };

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      const roomPeers = rooms.get(roomId)!;
      roomPeers.add(client);

      ws.send(
        JSON.stringify({
          type: 'room-joined',
          roomId,
          participantCount: roomPeers.size,
          peers: Array.from(roomPeers)
            .filter((p) => p !== client)
            .map((p) => ({ userId: p.userId, role: p.role, name: p.name })),
        })
      );

      broadcastToRoom(roomId, client, {
        type: 'peer-joined',
        userId: client.userId,
        role: client.role,
        name: client.name,
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (!msg || typeof msg.type !== 'string') return;

          if (
            ['offer', 'answer', 'ice-candidate', 'peer-media-state', 'chat-message', 'call-ended'].includes(
              msg.type
            )
          ) {
            broadcastToRoom(roomId, client, {
              ...msg,
              senderId: client.userId,
              senderRole: client.role,
              senderName: client.name,
              timestamp: new Date().toISOString(),
            });
          }
        } catch {
          // Ignore malformed JSON frames
        }
      });

      ws.on('close', () => {
        const peers = rooms.get(roomId);
        if (!peers) return;
        peers.delete(client);
        broadcastToRoom(roomId, null, {
          type: 'peer-left',
          userId: client.userId,
          role: client.role,
          name: client.name,
        });
        if (peers.size === 0) {
          rooms.delete(roomId);
        }
      });
    } catch {
      ws.close(4002, 'Invalid authentication token');
    }
  });
}
