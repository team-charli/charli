import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import useLocalStorage from '@rehooks/local-storage';

export const useRouteRedirect = () => {
    const router = useRouter();
    const {currentAccount, sessionSigs, authMethod} = useAuthContext();
    const [isOnboarded] = useLocalStorage("isOnboarded");

    useEffect(() => {
        if (authMethod && currentAccount && sessionSigs) {
            if (!isOnboarded) {
                router.push('/onboard');
            } else {
                router.push('/lounge');
            }
        }
    }, [authMethod, currentAccount, sessionSigs, isOnboarded, router]);
};
