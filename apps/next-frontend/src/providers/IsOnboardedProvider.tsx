// src/app/providers/IsOnboardedProvider.tsx
import { ReactNode } from 'react';
import { createClient } from '@/utils/supabase/server';
import { IRelayPKP } from '@lit-protocol/types';

interface IsOnboardedProviderProps {
  children: (props: { isOnboarded: boolean }) => ReactNode;
  currentAccount: IRelayPKP | null;
}

export default async function IsOnboardedProvider({ children, currentAccount }: IsOnboardedProviderProps) {
  const supabaseClient = createClient();
  // Fetch the user's onboarding status from the Supabase API
  const { data, error } = await supabaseClient
    .from('user_data')
    .select('id, user_address')
    .eq('user_address', currentAccount?.ethAddress)
    .single();
  const isOnboarded = !error && !!data;
  return <>{children({ isOnboarded })}</>;
}
