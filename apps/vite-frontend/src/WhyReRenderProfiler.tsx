import { Profiler, useRef, ComponentType, ProfilerOnRenderCallback } from 'react';
import isEqual from 'lodash/isEqual';

function withRenderTracker<P extends object>(Component: ComponentType<P>) {
  function TrackedComponent(props: P) {
    const prevPropsRef = useRef<P | null>(null);

    const onRender: ProfilerOnRenderCallback = (
      _id,
      phase,
      _actualDuration,
      _baseDuration,
      _startTime,
      _commitTime
    ) => {
      if (phase === "update" || phase === "nested-update") {
        const changedProps: Record<string, boolean> = {};
        let hasChanges = false;

        // Only check for changes on updates, not initial mount
        if (prevPropsRef.current) {
          (Object.keys(props) as Array<keyof P>).forEach(key => {
            if (!isEqual(props[key], prevPropsRef.current?.[key])) {
              changedProps[key as string] = true;
              hasChanges = true;
            }
          });

          if (hasChanges) {
            console.log(`Re-render caused by props: ${Object.keys(changedProps).join(', ')}`);
          } else {
            console.log('Re-render without prop changes - check context/parent renders');
          }
        }
      }

      prevPropsRef.current = {...props};
    };

    return (
      <Profiler id={Component.displayName || Component.name || 'Component'} onRender={onRender}>
        <div className="debug-wrapper text-xs sm:text-sm md:text-base lg:text-base">
          <Component {...props} />
        </div>
      </Profiler>
    );
  }

  // Copy over display name for better debugging
  const displayName = Component.displayName || Component.name;
  TrackedComponent.displayName = `withRenderTracker(${displayName})`;

  return TrackedComponent as ComponentType<P>;
}

export default withRenderTracker;
