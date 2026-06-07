const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');
const cors = require('cors');
const path = require('path'); // Added for file paths

const app = express();
app.use(cors());
app.use(express.json());

// --- NEW: SERVE FRONTEND FILES ---
// This tells the server to allow people to see your HTML/JS files
app.use(express.static(path.join(__dirname, '/'))); 

// Serve the index.html file when someone visits the main URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
// ---------------------------------

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const activeStreams = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

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
        tt.on('like', (data) => io.to(sessionId).emit('event', { type: 'LIKE', data }));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> HOST-IT ENGINE & VISUALS ONLINE <<<`);
});
