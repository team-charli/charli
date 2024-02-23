import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl, supabaseKey);
const huddleApiKey = Deno.env.get('HUDDLE_API_KEY') ?? '';


Deno.serve(async (req) => {
  try {
    const payload = await req.json();

    const response = await fetch('https://api.huddle01.com/api/v1/create-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': huddleApiKey,
        'Accept': '*/*',
      },
      body: JSON.stringify({
        title: 'Huddle01-Test',
        // roomType: 'VIDEO',
        // startTime: confirmed_time_date,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const _response = await response.json();
    const roomId = _response.data.roomId;

    const { error } = await supabase
      .from('sessions')
      .update({huddle_room_id: roomId})
      .eq('session_id', payload.record.session_id);

    if (error) {
      console.error(error);
      return new Response('Error updating session', { status: 500 });
    }
    console.log("Success")
    return new Response('Session updated successfully', { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error processing request', { status: 500 });
  }
});
