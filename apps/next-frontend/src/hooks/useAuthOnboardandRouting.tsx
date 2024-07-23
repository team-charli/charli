// useAuthOnboardAndRouting.tsx
import { useRouting } from './useRouting';
import { useInvalidateAuthQueries } from './Auth/useInvalidateAuthQueries';
import { useCheckAndRefreshAuthChain } from './Auth/useCheckAndRefreshAuthChain';
import { useAuth } from '@/contexts/AuthContext';

export const useAuthOnboardAndRouting = () => {
  const auth = useAuth(); // This will give us access to the result of useAuthChain
  const refreshAuthChain = useCheckAndRefreshAuthChain();
  const routing = useRouting();
  const invalidateQueries = useInvalidateAuthQueries();

  // Only enable refreshAuthChain and routing when useAuthChain is complete
  const isAuthChainComplete = auth.isSuccess && !auth.isLoading;
  return {
    authChainStatus: refreshAuthChain,
    routing,
    invalidateQueries,
    refreshAuthChain: () => refreshAuthChain.refetch(),
    isAuthChainComplete,
  };
};
