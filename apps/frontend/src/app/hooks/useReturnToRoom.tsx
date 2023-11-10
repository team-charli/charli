import { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

export const useReturnToRoom = () => {
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/room')) {
      localStorage.setItem('lastVisited', location.pathname);
      localStorage.setItem('timestamp', Date.now().toString());
    }
  }, [location]);

  useEffect(() => {
    if (location.pathname === '/') {
      const lastVisited = localStorage.getItem('lastVisited');
      const timestamp = localStorage.getItem('timestamp');
      const duration = 5 * 60 * 1000; // 5 minutes

      if (lastVisited && timestamp && (Date.now() - Number(timestamp)) <= duration) {
        history.replace(lastVisited);
      } else {
        localStorage.removeItem('lastVisited');
        localStorage.removeItem('timestamp');
      }
    }
  }, [history, location.pathname]);
};

export default useReturnToRoom;
