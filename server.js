const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const { WebcastPushConnection } = require('tiktok-live-connect');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const activeStreams = new Map();

io.on('connection', (socket) => {
    socket.on('join-session', (sessionId) => {
        socket.join(sessionId);
    });

    socket.on('start-tiktok', ({ sessionId, tiktokHandle }) => {
        if (activeStreams.has(sessionId)) {
            activeStreams.get(sessionId).disconnect();
        }
        const tt = new WebcastPushConnection(tiktokHandle);
        tt.connect().then(state => {
            activeStreams.set(sessionId, tt);
            io.to(sessionId).emit('status', { status: 'connected' });
        }).catch(e => {
            io.to(sessionId).emit('status', { status: 'error', message: e.message });
        });
        tt.on('chat', (data) => io.to(sessionId).emit('event', { type: 'CHAT', data }));
        tt.on('gift', (data) => io.to(sessionId).emit('event', { type: 'GIFT', data }));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Application online on port ${PORT}`);
});