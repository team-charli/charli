// atoms.ts
import { atom } from 'jotai';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { createQueryAtom } from '@/utils/queryAtomUtils';

export const litNodeClientReadyAtom = atom<boolean>(false);


export const userJWTAtom = atom<string | null>(null);

export const renderLoginButtonsAtom = atom<boolean>(false);

export const selectedLangAtom = atom<string>('');

export const nativeLangAtom = atom<string>('');
