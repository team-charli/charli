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


const SESSION_RATES = 0.30; // $0.30 per minute
const TIME_OPTIONS = [30, 45, 60]; // minutes

import { useEffect } from 'react';

const BolsaRoute = () => {
  const { data: isOnboarded } = useIsOnboarded();
  const { data: isLitLoggedIn } = useIsLitLoggedIn();
  const { data: wallet } = useLitAccount();

  const [amt, setAmt] = useState<number | null>(null);
  const [mode, setMode] = useState<'deposit' | 'withdraw' | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [customTime, setCustomTime] = useState<string>('');
  const [showZkp2pModal, setShowZkp2pModal] = useState(false);

  if (isLitLoggedIn && !isOnboarded) throw redirect({ to: '/onboard' });
  let modal
  if (isOnboarded && isLitLoggedIn) {
    modal = null;
  } else if (!isLitLoggedIn && isOnboarded) {
    modal = <UturnModal />
  } else if (isLitLoggedIn && !isOnboarded) {
    modal = null;
    console.log('push to /onboard');
    throw redirect({to:"/onboard" } )
  }

  function handleTimeSelect(time: number) {
    setSelectedTime(time);
    const calculatedAmount = time * SESSION_RATES;
    setAmt(calculatedAmount);
    setShowTimePicker(false);
    setShowZkp2pModal(true);
  }

  function handleCustomSubmit() {
    const num = Number(customTime);
    if (!isNaN(num) && num > 0) {
      handleTimeSelect(num);
    }
  }

  return (

    <>
      <IconHeader />

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5 md:p-6 w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto mt-6 sm:mt-8 md:mt-10 border border-gray-100">
        <div className="flex flex-col items-center">
          <div className="bg-blue-50 p-4 sm:p-5 md:p-6 rounded-full mb-4 sm:mb-6">
            <p className="text-5xl sm:text-6xl md:text-7xl">🤵‍♀️</p>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mb-2 sm:mb-3">
            {0.0 /* TODO: usdcBalance */} USDC
          </h2>
          <p className="text-sm sm:text-base text-gray-500 mb-6">
            Your current balance
          </p>
          <div className="grid grid-cols-2 gap-4 w-full">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setMode('deposit');
                setShowTimePicker(true);
                setAmt(null); // reset
                setSelectedTime(null);
                setCustomTime('');
              }}
            >
              Deposit
            </Button>
            <Button
              className="bg-gray-200 hover:bg-gray-300 text-gray-800"
              onClick={() => setMode('withdraw')}
            >
              Withdraw
            </Button>
          </div>
        </div>
      </div>

      {/* Deposit mode: time picker */}
      {mode === 'deposit' && showTimePicker && (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5 md:p-6 w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto mt-6 sm:mt-8 md:mt-10 border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Choose session length</h3>
          <div className="flex flex-col gap-3">
            {TIME_OPTIONS.map((t) => (
              <Button key={t} onClick={() => handleTimeSelect(t)}>
                {t} minutes
              </Button>
            ))}
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                placeholder="Custom minutes"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="border rounded p-2 w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomSubmit();
                }}
              />
              <Button onClick={handleCustomSubmit}>Go</Button>
            </div>
          </div>
          <Button
            className="mt-4"
            onClick={() => {
              setShowTimePicker(false);
              setMode(null);
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Zkp2pModal for deposit */}
      {showZkp2pModal && amt !== null && wallet?.pkp && (
        <Zkp2pModal
          amount={amt}
          pkp={wallet.pkp}
          open={showZkp2pModal}
          onClose={() => setShowZkp2pModal(false)}
          onSettled={(orderId) => {
            alert(`Deposit complete with order ID: ${orderId}`);
            setShowZkp2pModal(false);
            setAmt(null);
            setMode(null);
          }}
        />
      )}

      {/* Withdraw mode: show balance & input */}
      {mode === 'withdraw' && isLitLoggedIn && isOnboarded && (
        <div className="flex flex-col gap-4 mt-6">
          <p>Your PKP USDC balance: {/* TODO: usdcBalance */} USDC</p>
          <input
            type="number"
            min={0}
            placeholder="Amount to withdraw"
            className="border px-2 py-1 rounded"
          />
          <Button>Withdraw</Button>
        </div>
      )}

      {!isLitLoggedIn && isOnboarded && <UturnModal />}
    </>
  );
};

export default BolsaRoute;
