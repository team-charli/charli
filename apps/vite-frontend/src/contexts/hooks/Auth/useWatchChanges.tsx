// useWatchAuthChanges.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLitAccount, useIsOnboarded, useIsLitLoggedIn } from '@/contexts/AuthContext';

export function useWatchAuthChanges() {
  const queryClient = useQueryClient();
  const litAccountQuery = useLitAccount();
  const isOnboardedQuery = useIsOnboarded();
  const isLitLoggedInQuery = useIsLitLoggedIn();

  useEffect(() => {
    console.log("isOnboardedQuery.data", isOnboardedQuery.data)
    queryClient.invalidateQueries({queryKey:['authRouting']});
  }, [
    queryClient,
    litAccountQuery.data,
    isOnboardedQuery.data,
    isLitLoggedInQuery.data
  ]);
}
