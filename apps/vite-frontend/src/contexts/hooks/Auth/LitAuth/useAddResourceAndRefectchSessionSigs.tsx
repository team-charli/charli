import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext'
import {LitAccessControlConditionResource, LitAbility} from "@lit-protocol/auth-helpers";
import {AccessControlConditions} from "@lit-protocol/types";

export const useAddResourceAndRefectchSessionSigsQuery = () => {
  const queryClient = useQueryClient();
  const authChainResult = useAuth();
  const sessionSigsQuery = authChainResult.queries.find(q => q.name === 'sessionSigs')?.query;

  const addResourceAndRefetch = async (accessControlConditions: AccessControlConditions | null , dataToEncryptHash: string | null) => {
    if (!sessionSigsQuery) {
      throw new Error('SessionSigs query not found');
    }
    if (!accessControlConditions) throw new Error('AccessControlConditions undefined or null')
    if (!dataToEncryptHash) throw new Error("dataToEncryptHash undefined")

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
    const cachedQuery = queryCache.find({ queryKey: ['sessionSigs'] });

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

    // Refetch the query and return the new data
    const { data: newSessionSigs } = await queryClient.refetchQueries({
      queryKey: cachedQuery.queryKey,
      exact: true
    });

    return newSessionSigs;
  };

  return addResourceAndRefetch;
};
