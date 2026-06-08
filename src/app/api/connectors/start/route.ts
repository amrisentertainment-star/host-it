import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { streamerUsername, sessionId } = await req.json();

    if (!streamerUsername || !sessionId) {
      return NextResponse.json({ error: 'Missing username or session' }, { status: 400 });
    }

    // DYNAMIC IMPORT: This prevents Webpack from 
    // trying to parse the .proto files during the build phase
    const tiktokConnector = await import('tiktok-live-connector');
    const { WebcastPushConnection } = tiktokConnector;

    const tiktokConnection = new WebcastPushConnection(streamerUsername);

    tiktokConnection.connect().then(state => {
      console.log(`Connected to TikTok: ${streamerUsername}`);
    }).catch(err => {
      console.error('TikTok Connection Error', err);
    });

    // Listen for chat
    tiktokConnection.on('chat', async (data) => {
      const commandText = data.comment.toLowerCase();
      if (commandText.includes('open') || commandText.includes('safe') || commandText.includes('deal')) {
        await supabase.from('game_commands').insert({
          session_id: sessionId,
          username: data.uniqueId,
          command_text: commandText,
          processed: false
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
