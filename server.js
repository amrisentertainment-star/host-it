const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');
const next = require('next');
const cors = require('cors');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
    const app = express();
    app.use(cors());
    
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"] }
    });

    const activeStreams = new Map();

    io.on('connection', (socket) => {
        socket.on('join-session', (sessionId) => socket.join(sessionId));

        socket.on('start-tiktok', ({ sessionId, tiktokHandle }) => {
            if (activeStreams.has(sessionId)) activeStreams.get(sessionId).disconnect();
            
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

    // Tell Express to let Next.js handle all other routes (the visuals)
    app.all('*', (req, res) => {
        return handle(req, res);
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, (err) => {
        if (err) throw err;
        console.log(`>>> NEXT.JS + TIKTOK ENGINE ONLINE ON PORT ${PORT} <<<`);
    });
});
