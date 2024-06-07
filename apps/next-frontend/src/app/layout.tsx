// app/layout.tsx
import '@/styles/globals.css';
import LitSessionProvider from '@/providers/LitSessionProvider';
import LitAuthenticationProvider from '@/providers/LitAuthenticationProvider';
import LitAccountProvider from '@/providers/LitAccountProvider';
import { redirect } from 'next/navigation';
import IsOnboardedProvider from '@/providers/IsOnboardedProvider';
import LitLoggedInProvider from '@/providers/IsLitLoggedInProvider';
import { compose } from '@/utils/compose';
import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: (props: { isLitLoggedIn: boolean; isOnboarded: boolean }) => ReactNode;
  redirectUri: string;
  authMethod: AuthMethod | null;
  currentAccount: IRelayPKP | null;
  sessionSigs: SessionSigs | null;
}

const Providers = compose<ProvidersProps>(
  ({ children, redirectUri, authMethod, currentAccount, sessionSigs }) => (
    <LitAuthenticationProvider redirectUri={redirectUri}>
      {(props) => children({ ...props, authMethod, currentAccount, sessionSigs })}
    </LitAuthenticationProvider>
  ),
  ({ children, authMethod, currentAccount, sessionSigs }) => (
    <LitAccountProvider authMethod={authMethod}>
      {(props) => children({ ...props, currentAccount, sessionSigs })}
    </LitAccountProvider>
  ),
  ({ children, authMethod, currentAccount, sessionSigs }) => (
    <LitSessionProvider authMethod={authMethod} currentAccount={currentAccount}>
      {(props) => children({ ...props, sessionSigs })}
    </LitSessionProvider>
  ),
  ({ children, currentAccount, sessionSigs }) => (
    <LitLoggedInProvider currentAccount={currentAccount} sessionSigs={sessionSigs}>
      {children}
    </LitLoggedInProvider>
  ),
  ({ children, currentAccount }) => <IsOnboardedProvider currentAccount={currentAccount}>{children}</IsOnboardedProvider>
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

  return (
    <html>
      <body>
        <Providers redirectUri={redirectUri} authMethod={null} currentAccount={null} sessionSigs={null}>
          {({ isLitLoggedIn, isOnboarded }) => {
            if (isLitLoggedIn && !isOnboarded) {
              redirect('/onboard');
            } else if (isLitLoggedIn && isOnboarded) {
              redirect('/lounge');
            } else if (!isLitLoggedIn) {
              redirect('/');
            }
            return <>{children}</>;
          }}
        </Providers>
      </body>
    </html>
  );
}
