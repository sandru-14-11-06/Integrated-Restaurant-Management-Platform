import 'dotenv/config';
import http from 'node:http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDatabase } from './config/db.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to at least 32 characters');
}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL?.split(',') || 'http://localhost:5173' } });
app.set('io', io);
const port = process.env.PORT || 5000;

connectDatabase().then(() => server.listen(port, () => console.log(`IRMP API listening on http://localhost:${port}`)))
  .catch((error) => { console.error('Could not connect to MongoDB:', error.message); process.exit(1); });
