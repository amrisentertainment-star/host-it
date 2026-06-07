// 1. Dependencies
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');
const cors = require('cors');

// 2. Setup
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// 3. Socket Configuration
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const activeStreams = new Map();

// 4. Connection Logic
io.on('connection', (socket) => {
    console.log('User connected to socket:', socket.id);

    // Join room for multi-tenancy
    socket.on('join-session', (sessionId) => {
        socket.join(sessionId);
        console.log(`Socket ${socket.id} joined room ${sessionId}`);
    });

    // Start TikTok Connection
    socket.on('start-tiktok', ({ sessionId, tiktokHandle }) => {
        console.log(`Attempting TikTok connect for: ${tiktokHandle}`);

        // Clean up previous connection for this session
        if (activeStreams.has(sessionId)) {
            activeStreams.get(sessionId).disconnect();
        }

        const tt = new WebcastPushConnection(tiktokHandle);

        tt.connect().then(state => {
            activeStreams.set(sessionId, tt);
            io.to(sessionId).emit('status', { status: 'connected', roomId: state.roomId });
        }).catch(e => {
            io.to(sessionId).emit('status', { status: 'error', message: e.message });
        });

        // Forward TikTok Events to the Socket Room
        tt.on('chat', (data) => io.to(sessionId).emit('event', { type: 'CHAT', data }));
        tt.on('gift', (data) => io.to(sessionId).emit('event', { type: 'GIFT', data }));
        tt.on('like', (data) => io.to(sessionId).emit('event', { type: 'LIKE', data }));
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// 5. Port Binding (The Railway Fix)
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> HOST-IT ENGINE ONLINE <<<`);
    console.log(`>>> LISTENING ON PORT ${PORT} <<<`);
});
