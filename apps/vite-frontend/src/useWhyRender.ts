import { useRef, useEffect } from 'react';

export function useRenderLogger(componentName: string) {
  const renderCount = useRef(0);
  const prevProps = useRef<any>({});

  useEffect(() => {
    renderCount.current += 1;
    console.log(`${componentName} rendered. Count: ${renderCount.current}`);
  });

  return (props: any) => {
    const changedProps: Record<string, { old: any; new: any }> = {};

    Object.entries(props).forEach(([key, value]) => {
      if (prevProps.current[key] !== value) {
        changedProps[key] = { old: prevProps.current[key], new: value };
      }
    });

    if (Object.keys(changedProps).length > 0) {
      console.log(`${componentName} re-rendered due to prop changes:`, changedProps);
    }

    prevProps.current = props;
  };
}
