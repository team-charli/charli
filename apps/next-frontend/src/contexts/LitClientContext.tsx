// // 'use client'
// // LitClientProvider.tsx
// import React, { ReactNode, useEffect } from 'react';
// import { useRecoilValue } from 'recoil';
// import { litNodeClientAtom } from '@/atoms/atoms';

// interface LitClientProviderProps {
//   children: ReactNode;
// }

// export const LitClientProvider = ({ children }: LitClientProviderProps) => {
//   const litNodeClient = useRecoilValue(litNodeClientAtom);

//   useEffect(() => {
//     const connectClient = async () => {
//       try {
//         await litNodeClient.connect();
//         console.log("LitNodeClient connected");
//       } catch (error) {
//         console.error("Error connecting LitNodeClient:", error);
//       }
//     };
//     connectClient();
//   }, [litNodeClient]);

//   return <>{children}</>;
// };
