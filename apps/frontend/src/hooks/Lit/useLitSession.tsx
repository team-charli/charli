import {useHistory} from 'react-router-dom'
import { useCallback, useState } from 'react';
import { AuthMethod } from '@lit-protocol/types';
import { getSessionSigs } from '../../utils/lit';
import { LitAbility, LitActionResource } from '@lit-protocol/auth-helpers';
import { IRelayPKP, SessionSigs  } from '@lit-protocol/types';

export default function useLitSession() {
  const [sessionSigs, setSessionSigs] = useState<SessionSigs>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error>();
  const history = useHistory();

  /**
   * Generate session sigs and store new session data
   */
  const initSession = useCallback(
    async (authMethod: AuthMethod, pkp: IRelayPKP): Promise<void> => {
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

        // Generate session sigs
        const sessionSigs = await getSessionSigs({
          pkpPublicKey: pkp.publicKey,
          // authSig,
          authMethod,
          sessionSigsParams: {
            chain,
            expiration,
            resourceAbilityRequests: resourceAbilities,
          },
        });
        console.log(`setting sessionSigs`)
        localStorage.setItem('sessionSigs', JSON.stringify(sessionSigs))
        setSessionSigs(sessionSigs);
      } catch (err) {
        console.log("error", err)
        setError(err as Error);

      } finally {
        setLoading(false);
        history.push('/onboard')
      }
    },
    []
  );

  return {
    sessionSigs,
    initSession,
    loading,
    error,
  };
}

