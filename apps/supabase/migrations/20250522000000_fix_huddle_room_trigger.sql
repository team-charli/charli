-- This migration fixes the create_huddle_room trigger and whatsapp notification trigger
-- by replacing them with custom functions that don't rely on http_request

-- Step 1: Create a dedicated huddle room creation function
CREATE OR REPLACE FUNCTION public.create_huddle_room_function()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://onhlhmondvxwwiwnruvo.supabase.co/functions/v1/create-huddle-room';
  auth_token TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaGxobW9uZHZ4d3dpd25ydXZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5NzQ4ODU4NSwiZXhwIjoyMDEzMDY0NTg1fQ.UvvYsR8dPcA331nbjZavckGz4Rkab6haU2RcNok9q1Q';
  request_id INTEGER;
  payload JSONB;
BEGIN
  -- Prepare the payload with session information
  payload := jsonb_build_object(
    'record', jsonb_build_object(
      'session_id', NEW.session_id
    )
  );

  -- Use the net.http_post function directly to avoid the http_request function
  SELECT INTO request_id net.http_post(
    url := webhook_url,
    body := payload,
    params := '{}'::JSONB,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', concat('Bearer ', auth_token)
    ),
    timeout_milliseconds := 1000
  );
  
  -- Log the request for debugging if needed
  RAISE NOTICE 'Called huddle room creation for session_id: % with request_id: %', NEW.session_id, request_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_huddle_room ON public.sessions;
DROP TRIGGER IF EXISTS send_whatsapp_notification ON public.sessions;

-- Step 3: Create the new trigger using our dedicated function
CREATE TRIGGER create_huddle_room
AFTER UPDATE OF confirmed_time_date ON public.sessions
FOR EACH ROW
WHEN (old.confirmed_time_date IS DISTINCT FROM new.confirmed_time_date)
EXECUTE FUNCTION public.create_huddle_room_function();

-- Step 4: Create a notification function that also doesn't rely on http_request
CREATE OR REPLACE FUNCTION public.send_whatsapp_notification_function()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://onhlhmondvxwwiwnruvo.supabase.co/functions/v1/sendWhatsappNotification';
  auth_token TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaGxobW9uZHZ4d3dpd25ydXZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5NzQ4ODU4NSwiZXhwIjoyMDEzMDY0NTg1fQ.UvvYsR8dPcA331nbjZavckGz4Rkab6haU2RcNok9q1Q';
  request_id INTEGER;
  payload JSONB;
BEGIN
  -- Prepare the payload with session information
  payload := jsonb_build_object(
    'record', to_jsonb(NEW),
    'old_record', to_jsonb(OLD),
    'op', TG_OP
  );

  -- Use the net.http_post function directly
  SELECT INTO request_id net.http_post(
    url := webhook_url,
    body := payload,
    params := '{}'::JSONB,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', concat('Bearer ', auth_token)
    ),
    timeout_milliseconds := 2000
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create the WhatsApp notification trigger
CREATE TRIGGER send_whatsapp_notification
AFTER UPDATE ON public.sessions
FOR EACH ROW
WHEN (
  (old.confirmed_time_date IS DISTINCT FROM new.confirmed_time_date) OR
  (old.session_rejected_reason IS DISTINCT FROM new.session_rejected_reason) OR
  (old.counter_time_date IS DISTINCT FROM new.counter_time_date) OR
  (old.request_time_date IS DISTINCT FROM new.request_time_date)
)
EXECUTE FUNCTION public.send_whatsapp_notification_function();

-- Add comments for documentation
COMMENT ON FUNCTION public.create_huddle_room_function() IS 'Function to call the create-huddle-room edge function when a session is confirmed';
COMMENT ON FUNCTION public.send_whatsapp_notification_function() IS 'Function to send WhatsApp notifications when session status changes';
COMMENT ON TRIGGER create_huddle_room ON public.sessions IS 'Trigger to call create-huddle-room edge function when a session is confirmed';
COMMENT ON TRIGGER send_whatsapp_notification ON public.sessions IS 'Trigger to send WhatsApp notifications when session status changes';