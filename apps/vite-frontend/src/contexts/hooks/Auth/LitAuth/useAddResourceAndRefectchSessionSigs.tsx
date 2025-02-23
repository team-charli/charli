//useAddResourceAndRefectchSessionSigs.tsx
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext'
import { LitAccessControlConditionResource, LitAbility } from "@lit-protocol/auth-helpers";
import { AccessControlConditions, SessionSigsMap } from "@lit-protocol/types";

export const useAddResourceAndRefectchSessionSigsQuery = () => {
  const queryClient = useQueryClient();
  const authChainResult = useAuth();
  const sessionSigsQuery = authChainResult.queries.find(q => q.name === 'sessionSigs')?.query;

  const addResourceAndRefetch = async (accessControlConditions: AccessControlConditions | null, dataToEncryptHash: string | null): Promise<SessionSigsMap | undefined> => {
    if (!sessionSigsQuery) {
      throw new Error('SessionSigs query not found');
    }
    if (!accessControlConditions) throw new Error('AccessControlConditions undefined or null');
    if (!dataToEncryptHash) throw new Error("dataToEncryptHash undefined");

    // Generate the new resource
    const accsResourceString = await LitAccessControlConditionResource.generateResourceString(
      accessControlConditions,
      dataToEncryptHash
    );
    const newResource = {
      resource: new LitAccessControlConditionResource(accsResourceString),
      ability: LitAbility.AccessControlConditionDecryption,
    };

    // Find the original queryKey
    const queryCache = queryClient.getQueryCache();
    const cachedQuery = queryCache.find({ queryKey: ['litSessionSigs'] });
    if (!cachedQuery) {
      throw new Error('SessionSigs query not found in cache');
    }

    // Update the query data
    queryClient.setQueryData(cachedQuery.queryKey, (oldData: any) => {
      if (oldData && oldData.resourceAbilityRequests) {
        return {
          ...oldData,
          resourceAbilityRequests: [...oldData.resourceAbilityRequests, newResource]
        };
      }
      return oldData;
    });

    // Refetch the query
    await queryClient.refetchQueries({
      queryKey: cachedQuery.queryKey,
      exact: true
    });

    // Retrieve the updated data from the cache
    const newSessionSigs = queryClient.getQueryData(cachedQuery.queryKey) as SessionSigsMap | undefined;

    return newSessionSigs;
  };

  return addResourceAndRefetch;
};
