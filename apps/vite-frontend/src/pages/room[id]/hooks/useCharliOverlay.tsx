import { useState, useCallback } from 'react';

interface CharliOverlayState {
  isVisible: boolean;
  answer: string | null;
}

export const useCharliOverlay = () => {
  const [state, setState] = useState<CharliOverlayState>({
    isVisible: false,
    answer: null,
  });

  const showOverlay = useCallback(() => {
    setState({
      isVisible: true,
      answer: null,
    });
  }, []);

  const showAnswer = useCallback((answer: string) => {
    setState({
      isVisible: true,
      answer,
    });
  }, []);

  const hideOverlay = useCallback(() => {
    setState({
      isVisible: false,
      answer: null,
    });
  }, []);

  return {
    ...state,
    showOverlay,
    showAnswer,
    hideOverlay,
  };
};