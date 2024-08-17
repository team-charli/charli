import { QueryClient } from "@tanstack/query-core";

export const signOutComplete = (queryClient: QueryClient ) => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('tanstack-query-')) {
        localStorage.removeItem(key);
      }
    });
    queryClient.clear();

}
