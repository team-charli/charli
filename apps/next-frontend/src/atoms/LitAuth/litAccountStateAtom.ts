import { createQueryAtom } from '@/utils/queryAtomUtils';
import { IRelayPKP } from '@lit-protocol/types';

export const litAccountAtoms = createQueryAtom<IRelayPKP>({
  data: null,
  error: undefined,
  isLoading: false,
});
