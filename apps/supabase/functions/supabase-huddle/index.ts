import axios from 'https://cdn.skypack.dev/axios';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);
const huddleApiKey = Deno.env.get('HUDDLE_API_KEY');

console.log('Hello from Edge Function!');

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { update_confirmed_time_date: confirmed_time_date } = payload;

    const roomResponse = await (axios as any).post(
      'https://api.huddle01.com/api/v1/create-room',
      {
        title: 'Huddle01-Test',
        roomType: 'VIDEO',
        startTime: confirmed_time_date,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': huddleApiKey,
        },
      }
    );
    const { meetingLink } = roomResponse.data;

    const { data, error } = await supabase
      .from('sessions')
      .update({ huddle_room_link: meetingLink })
      .match({ id: payload.id });
    if (error) {
      console.error(error);
      return new Response('Error updating session', { status: 500 });
    }

    return new Response('Session updated successfully', { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error processing request', { status: 500 });
  }
});
