import { useCallback, useState } from 'react';
import { AuthMethod } from '@lit-protocol/types';
import { getSessionSigs } from '../../utils/lit';
import { LitAbility, LitActionResource } from '@lit-protocol/auth-helpers';
import { IRelayPKP, SessionSigs  } from '@lit-protocol/types';
import { AuthContext } from '../../contexts/AuthContext'
import { useContextNullCheck } from '../../hooks/utils/useContextNullCheck'

export default function useSession() {
  const [sessionSigs, setSessionSigs] = useState<SessionSigs>();
  const {contextSessionSigs, contextSetSessionSigs} = useContextNullCheck(AuthContext);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error>();

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
          authMethod,
          sessionSigsParams: {
            chain,
            expiration,
            resourceAbilityRequests: resourceAbilities,
          },
        });

        setSessionSigs(sessionSigs);
        contextSetSessionSigs(sessionSigs);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    initSession,
    sessionSigs,
    loading,
    error,
  };
}

