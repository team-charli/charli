// atoms.ts
import { atom } from 'recoil';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';

export const litNodeClientReadyAtom = atom<boolean>({
  key: 'litNodeClientReady',
  default: false
})

export const pkpWalletAtom = atom<PKPEthersWallet | null>({
  key: 'pkpWallet',
  default: null,
});

export const userJWTAtom = atom<string | null>({
  key: 'userJWT',
  default: null,
});


export const renderLoginButtonsAtom = atom<boolean>({
  key: 'renderLoginButtons',
  default: false
})




