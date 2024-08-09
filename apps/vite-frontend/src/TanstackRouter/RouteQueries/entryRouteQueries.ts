import { QueryClient } from "@tanstack/query-core";

export const entryRouteQueries = (queryClient: QueryClient) => {
    const litAccount = queryClient.getQueryData(['litAccount']);
    const isOnboarded = queryClient.getQueryData(['isOnboarded', litAccount]);
    const isLitLoggedIn = queryClient.getQueryData(['isLitLoggedIn']);
    const isOAuthRedirect = queryClient.getQueryData(['isSignInRedirect']);


  return {litAccount, isOnboarded, isLitLoggedIn, isOAuthRedirect}
}
