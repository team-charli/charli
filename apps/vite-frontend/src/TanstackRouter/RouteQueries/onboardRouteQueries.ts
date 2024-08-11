import { QueryClient } from "@tanstack/query-core";

export const onboardRouteQueries = (queryClient: QueryClient) => {
    const litAccount = queryClient.getQueryData(['litAccount']);
    const isOnboarded = queryClient.getQueryData(['isOnboarded', litAccount]);
    const isLitLoggedIn = queryClient.getQueryData(['isLitLoggedIn']);
    const isOAuthRedirect = queryClient.getQueryData(['isSignInRedirect']);
    const hasBalance = queryClient.getQueryData(['hasBalance'])

    return {litAccount, isOnboarded, isLitLoggedIn, isOAuthRedirect, hasBalance}
}
