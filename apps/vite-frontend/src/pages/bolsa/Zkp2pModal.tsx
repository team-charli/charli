// src/pages/bolsa/Zkp2pModal.tsx
import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { buildZkp2pUrl } from '@/lib/zkp2p';

interface Props {
  amount: number | string;
  pkp: string;
  open: boolean;
  onClose: () => void;
  onSettled: (orderId: string) => void;
}

const Zkp2pModal = ({ amount, pkp, open, onClose, onSettled }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // every time the iframe navigates, check if it is now on *our* origin
  const handleLoad = () => {
    const frame = iframeRef.current;
    if (!frame) return;

    try {
      // throws while the src is still https://zkp2p.xyz (cross-origin) – that’s fine
      const url = new URL(frame.contentWindow!.location.href);

      // once the swap is complete ZKP-P2P bounces to /bolsa/success?orderId=…
      if (url.pathname === '/bolsa/success') {
        const id = url.searchParams.get('orderId');
        if (id) onSettled(id);
        onClose(); // close the modal
      }
    } catch (_) {
      /* ignore cross-origin */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-4 text-lg font-semibold">
          Fund wallet – ${amount} USDC
        </DialogHeader>

        <iframe
          ref={iframeRef}
          onLoad={handleLoad}
          className="w-full h-[720px] border-0"
          src={buildZkp2pUrl({ pkpAddress: pkp, usdAmount: amount })}
          title="ZKP-P2P On-Ramp"
        />
      </DialogContent>
    </Dialog>
  );
};

export default Zkp2pModal;
