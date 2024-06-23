// hooks/useSupabaseClient.ts
import { useRecoilValue, useRecoilCallback } from 'recoil';
import { userJWTAtom } from '@/atoms/atoms';
import { supabaseClientSelector } from '@/selectors/supabaseClientSelector';

export function useSupabaseClient() {
  const userJWT = useRecoilValue(userJWTAtom);
  const supabaseClient = useRecoilValue(supabaseClientSelector);

  const initializeSupabaseClient = useRecoilCallback(({ snapshot }) => async () => {
    try {
      const jwt = await snapshot.getPromise(userJWTAtom);
      if (!jwt) throw new Error("No JWT available");

      const client = await snapshot.getPromise(supabaseClientSelector);
      if (!client) throw new Error("Failed to initialize Supabase client");

      console.log("Supabase client initialized successfully");
      return client;
    } catch (error) {
      console.error("Error initializing Supabase client:", error);
      return null;
    }
  }, []);

  return {
    supabaseClient,
    userJWT,
    initializeSupabaseClient,
  };
}
