import {useHistory} from 'react-router-dom'
import { useCallback, useState } from 'react';
import { AuthMethod, SessionSig, SessionSigs } from '@lit-protocol/types';
import { getProviderByAuthMethod, getSessionKeyPair, getSessionSigs } from '../../utils/lit';
import { AuthSig, LitAbility, LitActionResource } from '@lit-protocol/auth-helpers';
import { IRelayPKP } from '@lit-protocol/types';
import { useAuthContext } from '../../contexts/AuthContext';
import useLocalStorage from '@rehooks/local-storage';

export default function useLitSession() {
  const [authSig] = useLocalStorage<AuthSig>("lit-wallet-sig");
  const [ sessionSigs, setSessionSigs ] = useLocalStorage<SessionSigs>("sessionSigs");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error>();
  const history = useHistory();

  /**
   * Generate session sigs and store new session data
   */
  const initSession = useCallback(
    async (authMethod: AuthMethod, pkp: IRelayPKP): Promise<void> => {
      console.log('run initSession')
      setLoading(true);
      setError(undefined);
      try {
        // Prepare session sigs params
        const chain = 'ethereum';
        const resourceAbilities = [
          {
            resource: new LitActionResource('*'),
            ability: LitAbility.PKPSigning,
          },
        ];
        const expiration = new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 7
        ).toISOString(); // 1 week

        // {getSessionSigs} from 'utils/lit.tsx'
        // const sessionSigs = await getSessionSigs({
        //   pkpPublicKey: pkp.publicKey,
        //   authMethod
        // });
        let provider
        try {
          provider = getProviderByAuthMethod(authMethod);
          if (!provider) {
            throw Error('no provider object')
          }
        } catch (e) {
          console.error('error obtaining provider', e)
        }
        const localSessionSigs = sessionSigs;
        if (provider && !localSessionSigs) {
          const sessionSigs: SessionSigs = await provider.getSessionSigs({
            authMethod,
            pkpPublicKey: pkp.publicKey,
            sessionSigsParams: {
              chain: 'ethereum',
              resourceAbilityRequests: resourceAbilities},
          });
          console.log(`setting sessionSigs: `, sessionSigs)
          setSessionSigs(sessionSigs);
        }
      } catch (e) {
        const error = e as Error;
        console.error("initSession: stack", error.stack)
        console.error("initSession: error", error)
        setError(error as Error);

      } finally {
        setLoading(false);
        history.push('/onboard')
      }
      // }
    },
    [authSig]
  );

  return {
    sessionSigs,
    initSession,
    loading,
    error,
  };
}

