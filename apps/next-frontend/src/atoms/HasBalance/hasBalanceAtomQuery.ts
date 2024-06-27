import { atomWithQuery } from 'jotai-tanstack-query';
import { ethers } from 'ethers';
import { litNodeClientReadyAtom } from '@/atoms/atoms';
import { isOnboardedAtom } from '../userDataAtoms';
import { pkpWalletAtom } from '../PkpWallet/pkpWalletAtomQuery';
import { fetchLitAccountsAtom } from '../LitAuth/litAccountsAtomQuery';

export const hasBalanceAtom = atomWithQuery((get) => ({
  queryKey: ['hasBalance', get(isOnboardedAtom), get(pkpWalletAtom), get(fetchLitAccountsAtom), get(litNodeClientReadyAtom)],
  queryFn: async (): Promise<boolean | null> => {
    const isOnboarded = get(isOnboardedAtom);
    const pkpWallet = get(pkpWalletAtom).data;
    const currentAccount = get(fetchLitAccountsAtom).data;
    const litNodeClientReady = get(litNodeClientReadyAtom);

    if (!isOnboarded || !pkpWallet || !currentAccount || !litNodeClientReady) {
      console.log('Dependencies not ready for balance check');
      return null;
    }

    try {
      const balance = await pkpWallet.getBalance(currentAccount.ethAddress);
      const minBalanceWei = ethers.parseEther('0.003259948275487362');
      return balance.gt(minBalanceWei);
    } catch (e) {
      console.error('Error checking balance:', e);
      return null;
    }
  },
  enabled: !!get(isOnboardedAtom) && !!get(pkpWalletAtom).data && !!get(fetchLitAccountsAtom).data && !!get(litNodeClientReadyAtom),
}));
