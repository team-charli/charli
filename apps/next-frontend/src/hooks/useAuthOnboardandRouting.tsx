// useAuthOnboardAndRouting.tsx
import { useRouting } from './useRouting';
import { useCheckAndRefreshAuthChain } from './Auth/useCheckAndRefreshAuthChain';

export const useAuthOnboardAndRouting = () => {
  // useCheckAndRefreshAuthChain();
  useRouting();
};
