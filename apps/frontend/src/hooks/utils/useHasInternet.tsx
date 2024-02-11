import isOnline from 'is-online';
import { useState } from "react"
import { useAsyncEffect } from "./useAsyncEffect"

const useHasInternet = () => {
  const [hasInternet, setHasInternet] = useState(false);

  useAsyncEffect(async () => {
    const _isOnline = await isOnline();
    setHasInternet(_isOnline);
  },
    async () => Promise.resolve(),
    []);

  return hasInternet;
}

export default useHasInternet;
