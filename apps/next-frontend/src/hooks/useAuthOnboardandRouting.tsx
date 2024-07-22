// useAuthOnboardAndRouting.tsx
import { useRefreshAuthChain } from './Auth/refreshAuthChain';
import { useRouting } from './useRouting';
import { useInvalidateAuthQueries } from './Auth/useInvalidateAuthQueries';

export const useAuthOnboardAndRouting = () => {
  const refreshAuthChain = useRefreshAuthChain();
  const routing = useRouting();
  const invalidateQueries = useInvalidateAuthQueries();

  return {
    authChainStatus: refreshAuthChain,
    routing,
    invalidateQueries,
    refreshAuthChain: () => refreshAuthChain.refetch(),
  };
};
