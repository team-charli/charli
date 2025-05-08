// components/ProfilerWrapper.tsx
import React, { Profiler, ProfilerOnRenderCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { router } from "@/TanstackRouter/router"
import { RouteComponent } from '@tanstack/react-router';

interface ProfilerConfig {
  name: string;
  disabled?: boolean;
  includeRender?: boolean;
  includeUpdates?: boolean;
}

export const withProfiler = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config: ProfilerConfig
): RouteComponent<P> => {
  // Add console log to verify the HOC is being called
  console.log(`Creating profiler for ${config.name}`);

  const WithProfilerComponent = (props: P) => {
    const auth = useAuth();
    console.log(`Rendering profiler wrapper for ${config.name}`); // Debug render

    const debugFlashCallback: ProfilerOnRenderCallback = (
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime
    ) => {
      // Remove the duration filter to see all renders
      console.log(`${new Date().toISOString()} - ${id}`, {
        phase,
        actualDuration,
        baseDuration,
        authState: {
          isLoading: auth.isLoading,
          isSuccess: auth.isSuccess,
          queries: auth.queries.reduce((acc, {name, query}) => ({
            ...acc,
            [name]: query.status
          }), {})
        },
        currentRoute: router.state.location.pathname,
        props: JSON.stringify(props) // Add props debugging
      });
    };

    return (
      <Profiler id={config.name} onRender={debugFlashCallback}>
        <div className="w-full text-xs sm:text-sm md:text-base lg:text-base">
          <WrappedComponent {...props} />
        </div>
      </Profiler>
    );
  };

  WithProfilerComponent.displayName =
    `WithProfiler(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithProfilerComponent;
};
