// useUserData.ts
import { useState, useEffect } from 'react';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import useLocalStorage from '@rehooks/local-storage';
import { useSupabase } from '@/contexts';
import { useLitLoggedIn } from '@/hooks/Lit';

export const useUserData = () => {
  const {client: supabaseClient, supabaseLoading} = useSupabase();
  const isLitLoggedin = useLitLoggedIn();
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount');
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs');
  const [isOnboarded, setIsOnboarded] = useLocalStorage<boolean>('isOnboarded')
  const [name, setName] = useState('');
  const [learningLangs, setLearningLangs] = useState<string[]>([]);
  const [teachingLangs, setTeachingLangs] = useState<string[]>([]);
  const [hasBalance, setHasBalance] = useState(false);

  useEffect(() => {
    // Replace this with your actual data loading logic
    const userData = {
      name: 'John Doe',
      learningLangs: ['English', 'Spanish'],
      teachingLangs: ['French'],
      isOnboarded: true,
      hasBalance: false,
    };

    setName(userData.name);
    setLearningLangs(userData.learningLangs);
    setTeachingLangs(userData.teachingLangs);
    setIsOnboarded(userData.isOnboarded);
    setHasBalance(userData.hasBalance);
  }, [setIsOnboarded]);

  return {
    currentAccount,
    sessionSigs,
    name,
    setName,
    learningLangs,
    setLearningLangs,
    teachingLangs,
    setTeachingLangs,
    isOnboarded,
    setIsOnboarded,
    hasBalance,
    setHasBalance,
    supabaseClient,
    supabaseLoading,
    isLitLoggedin
  };
};

