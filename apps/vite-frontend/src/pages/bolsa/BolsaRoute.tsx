// src/pages/bolsa/BolsaRoute.tsx
import { useState } from 'react';
import IconHeader from '@/components/headers/IconHeader';
import {
  useIsLitLoggedIn,
  useIsOnboarded,
  useLitAccount,
} from '@/contexts/AuthContext';
import { redirect } from '@tanstack/react-router';
import UturnModal from '@/components/elements/UturnModal';
import Zkp2pModal from './Zkp2pModal';
import { Button } from '@/components/ui/button';

const AMOUNTS = [10, 25, 50, 75, 100]; // USD presets

const BolsaRoute = () => {
  const { data: isOnboarded } = useIsOnboarded();
  const { data: isLitLoggedIn } = useIsLitLoggedIn();
  const { data: wallet } = useLitAccount();

  const [amt, setAmt] = useState<number | null>(null);

  if (isLitLoggedIn && !isOnboarded) throw redirect({ to: '/onboard' });

  return (
    <>
      <IconHeader />

      <div className="flex flex-col items-center mt-20 gap-6">
        <p className="text-7xl">🤵‍♀️</p>

        {isLitLoggedIn && isOnboarded && (
          <div className="flex flex-wrap gap-4">
            {AMOUNTS.map((a) => (
              <Button key={a} onClick={() => setAmt(a)}>
                +${a} USDC
              </Button>
            ))}
          </div>
        )}

        {!isLitLoggedIn && isOnboarded && <UturnModal />}
      </div>

      {amt && wallet?.ethAddress && (
        <Zkp2pModal
          amount={amt}
          pkp={wallet.ethAddress}
          open
          onClose={() => setAmt(null)}
          onSettled={(orderId) => {
            console.log('USDC arrived via order', orderId);
            // → refetch balance, toast success, etc.
          }}
        />
      )}
    </>
  );
};

export default BolsaRoute;
