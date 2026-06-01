# OBS Integration Guide - HOST IT!

## Quick Start

HOST IT! provides a **browser source overlay** that works seamlessly with OBS Studio. Here's how to set it up:

## Step 1: Get Your Overlay URL

Your overlay URL format is:
```
http://localhost:3000/overlay/beat-the-banker/{your-tiktok-username}
```

**Example:**
```
http://localhost:3000/overlay/beat-the-banker/s1lvabull3tgaming
```

## Step 2: Add Browser Source in OBS

### If Running Locally (Same Computer)

1. **Open OBS Studio**
2. **Add a new Source:**
   - Click the **+** button in the Sources panel
   - Select **Browser**
   - Give it a name (e.g., "HOST IT Overlay")

3. **Configure the Browser Source:**
   - **URL:** `http://localhost:3000/overlay/beat-the-banker/YOUR_USERNAME`
   - **Width:** 1920
   - **Height:** 1080
   - **FPS:** 60
   - Check ✅ **Shutdown source when not visible**

4. **Position the overlay:**
   - Drag and resize the browser source on your canvas
   - The overlay has a transparent background

### If Running on Remote Server

Replace `localhost:3000` with your server URL:
```
https://yourdomain.com/overlay/beat-the-banker/YOUR_USERNAME
```

## Step 3: Test Connection

1. Start your HOST IT! app (`npm run dev`)
2. Go to your **Dashboard** and click **"Start Game"** to launch the TikTok connector
3. The overlay should now display in OBS
4. **Test a TikTok event:**
   - Send a like or gift in your TikTok Live stream
   - You should see an alert appear on the overlay

## What's Displayed on the Overlay

The overlay shows real-time updates from your TikTok stream:

### 📌 Top Left - Stream Status
- Stream name and username
- Live status indicator (🔴 LIVE / ⚪ WAITING)
- Active player count

### 🎪 Center - Current Alert
- **Gifts** - Shows gift name, sender, quantity
- **Likes** - Displays hearts and like count
- **Follows** - Shows follower notification
- **Banker Offers** - Displays game banker offers
- All alerts auto-dismiss after 2-4 seconds

### 📡 Bottom Right - Event Feed
- Live scrolling feed of recent events
- Last 10 events displayed
- Shows chat, gifts, likes, follows, player actions

## Advanced Setup: Remote Server

If your HOST IT! is running on a remote server:

1. **Ensure WebSocket support:**
   - Your server must support WebSocket connections
   - Check firewall rules allow port access

2. **Configure CORS (if needed):**
   - Update your Next.js config for CORS headers
   - Socket.io should handle this automatically

3. **Use HTTPS:**
   - For production, use `https://` and `wss://` (secure WebSocket)
   - Update OBS to use your HTTPS URL

## Troubleshooting

### Overlay Not Showing
- ✅ Verify app is running: `npm run dev`
- ✅ Check URL is correct in browser first
- ✅ Restart OBS browser source

### No Events Appearing
- ✅ Make sure TikTok connector is started
- ✅ Send a test like/gift in your TikTok Live
- ✅ Check browser console in OBS (right-click source → Filters → Developer Tools)

### WebSocket Connection Errors
- ✅ Check console logs for connection errors
- ✅ Ensure your server allows WebSocket connections
- ✅ Check firewall/network rules

### Performance Issues
- ✅ Lower browser source FPS if needed
- ✅ Disable "Shutdown source when not visible" to prevent reconnects
- ✅ Reduce animation complexity in OBS settings

## Customization

### Change Overlay Position/Size
Edit `/app/overlay/beat-the-banker/[username]/` in the component positioning:
- Top left alerts use `absolute top-10 left-10`
- Center alerts use `absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`
- Bottom right uses `absolute bottom-10 right-10`

### Modify Colors/Styling
The overlay uses Tailwind CSS. Edit `/components/OverlayClient.tsx`:
- Change border colors: `border-cyan-400/20` → `border-purple-400/20`
- Change backgrounds: `bg-cyan-400/10` → `bg-purple-400/10`
- Modify animation speeds: `animate-pulse`, `animate-bounce`

### Add Custom Alerts
Update `/server/websocket/SocketServer.ts` to emit new event types:
```typescript
io?.to(`overlay:${username}`).emit("custom-event", {
  data: "your data",
  timestamp: new Date().toISOString(),
});
```

Then handle in `/components/OverlayClient.tsx`:
```typescript
socketInstance.on("custom-event", (data) => {
  // Handle custom event
});
```

## OBS Scene Composition Tips

1. **Main Scene:**
   - Game/Content in background
   - HOST IT Overlay on top layer
   - Set browser source to scale with window

2. **Recommended Canvas Size:**
   - 1920x1080 (1080p)
   - 2560x1440 (1440p)
   - Browser source adapts automatically

3. **Layer Order:**
   1. Background/Game
   2. Webcam
   3. Chat
   4. **HOST IT Overlay** (topmost)

## Production Checklist

- [ ] Overlay URL configured correctly in OBS
- [ ] TikTok connector starts automatically on game launch
- [ ] Test all event types (gift, like, follow, chat)
- [ ] Verify overlay visibility in OBS preview
- [ ] Check WebSocket connection in browser console
- [ ] Set appropriate OBS performance settings
- [ ] Create backup OBS scene configuration
- [ ] Test during actual TikTok Live stream

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Check browser console for errors (F12)
3. Check server logs for WebSocket errors
4. Review OBS browser source developer tools

---

**Happy hosting! 🎉**
