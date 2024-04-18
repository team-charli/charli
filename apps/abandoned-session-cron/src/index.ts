import ethers from 'ethers'
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabaseTypes';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  PRIVATE_KEY_RESOLVE_ABANDONED: string;
}

async function initializeSupabase(env: Env): Promise<SupabaseClient> {
  return createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
}

type SessionRow = Database['public']['Tables']['sessions']['Row'];
type UserAddress = { user_address: string | null };

function isSessionWithUserAddress(data: unknown): data is (SessionRow & UserAddress)[] {
  return Array.isArray(data) && data.every((item): item is SessionRow & UserAddress => {
    return (
      typeof item === 'object' &&
      item !== null &&
      'session_id' in item &&
      typeof item.session_id === 'number' &&
      'user_address' in item &&
      (typeof item.user_address === 'string' || item.user_address === null)
    );
  });
}

const handleScheduledEvent = async (event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
try {
  const supabase = await initializeSupabase(env);
  console.log(`Handling tasks scheduled for: ${new Date(event.scheduledTime).toISOString()}`);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      sessions.*,
      (select user_address from user_data where id = sessions.learner_id) as user_address
    `)
    .eq('session_resolved', false)
    .gte('confirmed_time_date', now);

  if (error) {
    console.error('Error fetching sessions:', error);
    return;
  }

  if (isSessionWithUserAddress(data) && data.length > 0) {
    await Promise.all(
      data.map(async (session) => {
        const { controller_public_key, controller_address, user_address } = session as any;
        const privateKey = env.PRIVATE_KEY_RESOLVE_ABANDONED;
        const wallet = new ethers.Wallet(privateKey);

        await fetch('https://vercel.com/userzachs-projects/action-trigger-abandoned-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ controller_public_key, controller_address, user_address }),
        });
      })
    );
  }

  ctx.waitUntil(
    Promise.resolve().then(() => console.log("Finished handling the scheduled event"))
  );
  } catch (error) {
    console.error(error)
  }
};

export default {
  scheduled: handleScheduledEvent
};
