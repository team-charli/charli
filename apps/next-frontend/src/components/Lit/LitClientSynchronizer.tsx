'use client'
// components/LitClientSynchronizer.tsx
import { useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { useLitClientReady } from '@/contexts/LitClientContext';
import { litNodeClientReadyAtom } from '@/atoms/atoms';

export const LitClientSynchronizer = () => {
  const { litNodeClientReady } = useLitClientReady();
  const setLitNodeClientReady = useSetRecoilState(litNodeClientReadyAtom);

  useEffect(() => {
    setLitNodeClientReady(litNodeClientReady);
  }, [litNodeClientReady, setLitNodeClientReady]);

  return null;
};
