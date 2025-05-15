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
  /* ───────────────────────────────────── state / queries ───────────────────────────────────── */
  const { data: isOnboarded }   = useIsOnboarded();
  const { data: isLitLoggedIn } = useIsLitLoggedIn();
  const { data: wallet }        = useLitAccount();

  const [amt, setAmt] = useState<number | null>(null);   // selected top-up amount

  /* ───────────────────────────── gate-keeping for onboarding flow ──────────────────────────── */
  if (isLitLoggedIn && !isOnboarded) throw redirect({ to: '/onboard' });

  let gateModal: JSX.Element | null = null;
  if (!isLitLoggedIn && isOnboarded) gateModal = <UturnModal />;

  /* ────────────────────────────────────────── render ───────────────────────────────────────── */
  return (
    <>
      {/* header */}
      <div className="w-full mb-4 sm:mb-6 md:mb-8">
        <IconHeader />
      </div>

      {/* main wallet card */}
      <div className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 md:px-8">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">
            Your Wallet
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-md mx-auto">
            Manage your earnings and transactions here
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 w-full max-w-sm sm:max-w-md md:max-w-lg border border-gray-100">
          <div className="flex flex-col items-center">
            <div className="bg-blue-50 p-4 sm:p-5 md:p-6 rounded-full mb-4 sm:mb-6">
              <p className="text-5xl sm:text-6xl md:text-7xl">🤵‍♀️</p>
            </div>

            {/* TODO: replace hard-coded balance with live query */}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mb-2 sm:mb-3">
              0.00&nbsp;USDC
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mb-6">
              Your current balance
            </p>

            {/* quick-amount deposit buttons (appear only when logged-in & onboarded) */}
            {isLitLoggedIn && isOnboarded ? (
              <div className="grid grid-cols-2 gap-4 w-full">
                {AMOUNTS.map((a) => (
                  <Button
                    key={a}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2"
                    onClick={() => setAmt(a)}
                  >
                    +${a} USDC
                  </Button>
                ))}
              </div>
            ) : (
              /* fallback buttons while gated */
              <div className="grid grid-cols-2 gap-4 w-full">
                <button className="bg-blue-300 text-white py-2 rounded-lg opacity-50 cursor-not-allowed">
                  Deposit
                </button>
                <button className="bg-gray-300 text-gray-600 py-2 rounded-lg opacity-50 cursor-not-allowed">
                  Withdraw
                </button>
              </div>
            )}
          </div>
        </div>

        {/* any gating modal (U-turn) */}
        {gateModal}
      </div>

      {/* ZKP-P2P on-ramp modal */}
      {amt && wallet?.ethAddress && (
        <Zkp2pModal
          amount={amt}
          pkp={wallet.ethAddress}
          open
          onClose={() => setAmt(null)}
          onSettled={(orderId) => {
            console.log('USDC arrived via order', orderId);
            // TODO: refetch balance, toast success, etc.
          }}
        />
      )}
    </>
  );
};

export default BolsaRoute;
