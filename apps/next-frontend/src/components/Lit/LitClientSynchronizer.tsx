'use client'
// components/LitClientSynchronizer.tsx
import { useEffect } from 'react';
import { useLitClientReady } from '@/contexts/LitClientContext';
import { litNodeClientReadyAtom } from '@/atoms/atoms';
import { useAtom } from 'jotai';

export const LitClientSynchronizer = () => {
  const { litNodeClientReady } = useLitClientReady();
  const [_,setLitNodeClientReady] = useAtom(litNodeClientReadyAtom)

  useEffect(() => {
    setLitNodeClientReady(litNodeClientReady);
  }, [litNodeClientReady, setLitNodeClientReady]);

  return null;
};
