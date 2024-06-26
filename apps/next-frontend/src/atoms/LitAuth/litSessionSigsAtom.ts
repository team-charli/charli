import { createQueryAtom } from '@/utils/queryAtomUtils';
import { SessionSigs } from '@lit-protocol/types';

export const litSessionSigsAtoms = createQueryAtom<SessionSigs>({
  data: null,
  error: undefined,
  isLoading: false,
});

