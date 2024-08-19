import { useRouter } from 'next/router';
import { useEffect } from 'react';

export const useReturnToRoom = () => {
  const router = useRouter();

  useEffect(() => {
    if (router.pathname.startsWith('/room')) {
      localStorage.setItem('lastVisited', router.pathname);
      localStorage.setItem('timestamp', Date.now().toString());
    }
  }, [router.pathname]);

  useEffect(() => {
    if (router.pathname === '/') {
      const lastVisited = localStorage.getItem('lastVisited');
      const timestamp = localStorage.getItem('timestamp');
      const duration = 5 * 60 * 1000; // 5 minutes

      if (lastVisited && timestamp && (Date.now() - Number(timestamp)) <= duration) {
        void (async () => {
          await router.replace(lastVisited);
        }
        )();
      } else {
        localStorage.removeItem('lastVisited');
        localStorage.removeItem('timestamp');
      }
    }
  }, [router]);

  return null;
};

export default useReturnToRoom;
