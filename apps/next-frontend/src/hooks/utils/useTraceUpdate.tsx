import { useEffect, useRef } from 'react';

// Constrain TProps to be an object with string keys. The values are of type unknown to allow for any value type.
function useTraceRerenders<TProps extends Record<string, unknown>>(props: TProps) {
  const prevProps = useRef<TProps>(props);

  useEffect(() => {

    const changedProps = Object.entries(props).reduce<Record<string, [unknown, unknown]>>((acc, [key, value]) => {
      // No need for key assertion anymore as TProps is already constrained to an object structure
      if (prevProps.current[key] !== value) {
        acc[key] = [prevProps.current[key], value];
      }
      return acc;
    }, {});

    if (Object.keys(changedProps).length > 0) {
      console.log('Changed props:', changedProps);
    }

    prevProps.current = props;
  // It's safer to use an empty array as the dependency list to avoid unintentional frequent executions.
  // You might consider a more complex approach if you need to react to specific props changes.
  }, [props]); // Empty array means this effect runs only on mount and unmount
}

export default useTraceRerenders;
