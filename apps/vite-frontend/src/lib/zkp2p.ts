// src/lib/zkp2p.ts
export const buildZkp2pUrl = ({
  pkpAddress,
  usdAmount,
}: {
  pkpAddress: string;
  usdAmount: number | string;
}) => {
  const params = new URLSearchParams({
    recipientAddress: pkpAddress,
    inputAmount: String(usdAmount),
    inputCurrency: 'USD',
    toToken: `8453:0xd9AA321d7f3Cbed91dF64e626D6fb3C64e0005C8`, // USDC on Base
    referrer: 'Charli.chat',
    referrerLogo: `${location.origin}/logo.svg`,
    // when the order fills ZKP-P2P will “bounce” the iframe to your own URL ↓
    callbackUrl: `${location.origin}/bolsa/success`,
  });
  return `https://zkp2p.xyz/swap?${params.toString()}`;
};
