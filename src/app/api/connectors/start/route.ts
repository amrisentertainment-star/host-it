import { NextRequest, NextResponse } from 'next/server';
import { WebcastPushConnection } from 'tiktok-live-connector';
import { supabase } from '@/lib/supabase';

// This prevents the route from being cached
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { streamerUsername, sessionId } = await req.json();

    if (!streamerUsername || !sessionId) {
      return NextResponse.json({ error: 'Missing username or session' }, { status: 400 });
    }

    // Initialize the TikTok Connection
    let tiktokConnection = new WebcastPushConnection(streamerUsername);

    // Connect to the live stream
    tiktokConnection.connect().then(state => {
      console.log(`Connected to TikTok: ${streamerUsername} with Room ID ${state.roomId}`);
    }).catch(err => {
      console.error('Failed to connect to TikTok', err);
    });

    // 1. Listen for CHAT COMMANDS (e.g., "open box 5")
    tiktokConnection.on('chat', async (data) => {
      const commandText = data.comment.toLowerCase();
      
      // Look for keywords: open, safe, deal, no deal
      if (commandText.includes('open') || commandText.includes('safe') || commandText.includes('deal')) {
        await supabase
          .from('game_commands')
          .insert({
            session_id: sessionId,
            username: data.uniqueId,
            command_text: commandText,
            processed: false
          });
      }
    });

    // 2. Listen for GIFTS (The "Trigger Gift" logic)
    // This adds people to the Queue when they send the trigger gift
    tiktokConnection.on('gift', async (data) => {
      // We load settings to see what the trigger gift is
      const { data: settings } = await supabase
        .from('streamer_game_settings')
        .select('trigger_gift')
        .eq('session_id', sessionId)
        .single();

      if (data.giftName === settings?.trigger_gift) {
        // Add user to game_control queue
        await supabase
          .from('game_control')
          .insert({
            session_id: sessionId,
            username: data.uniqueId,
            game_state: 'selecting_safe',
            current_round: 1,
            boxes_opened_this_round: 0
          });
      }
    });

    return NextResponse.json({ success: true, message: `Listener started for ${streamerUsername}` });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
