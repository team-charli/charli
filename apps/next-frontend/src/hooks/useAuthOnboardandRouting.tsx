import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useAtomValue } from 'jotai';
import { isOnboardedAtom, isLitLoggedInAtom, onboardModeAtom, isOAuthRedirectAtom } from '@/atoms/atoms';
import { useInitQueries } from './Auth/useInitQueries';


const getTargetRoute = (
  isLoading: boolean,
  isOAuthRedirect: boolean,
  isLitLoggedIn: boolean,
  isOnboarded: boolean | undefined,
  onboardMode: 'Teach' | 'Learn' | null,
  isSuccess: boolean
) => {
  if (typeof window === 'undefined' || isLoading || (isOAuthRedirect && !isSuccess)) {
    return null;
  }
  if (isLitLoggedIn && isOnboarded === false) return '/onboard';
  if (isLitLoggedIn && isOnboarded) return '/lounge';
  if (!isLitLoggedIn) return '/login';
  return null; // This should never happen, but we'll handle it just in case
};

export const useAuthOnboardAndRouting = () => {
  const router = useRouter();
  const { isLoading, isSuccess, isOnboardedQuery, authMethodQuery } = useInitQueries();
  const isOnboarded = useAtomValue(isOnboardedAtom);
  const isLitLoggedIn = useAtomValue(isLitLoggedInAtom);
  const onboardMode = useAtomValue(onboardModeAtom);
  const isOAuthRedirect = useAtomValue(isOAuthRedirectAtom);

  const { data: targetRoute, error: targetRouteError } = useQuery({
    queryKey: ['targetRoute'],
    queryFn: () => getTargetRoute(isLoading, isOAuthRedirect, isLitLoggedIn, isOnboarded, onboardMode, isSuccess),
    enabled: !isLoading && isSuccess && isOnboardedQuery.isSuccess && !!authMethodQuery.data,
  });

  useQuery({
    queryKey: ['routeNavigation'],
    queryFn: async () => {
      if (targetRoute && router.pathname !== targetRoute) {
        console.log(`Navigating to: ${targetRoute}`);
        await router.push(targetRoute);
      }
      return null;
    },
    enabled: !!targetRoute && targetRoute !== router.pathname,
  });

  if (targetRouteError) {
    console.error('Error determining target route:', targetRouteError);
  }

  return null;
};
