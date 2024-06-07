// app/utils/compose.tsx
type ComposedComponent<T> = (props: T) => JSX.Element;

export function compose<T>(...components: ComposedComponent<any>[]): ComposedComponent<T> {
  return components.reduce((AccumulatedComponents, CurrentComponent) => {
    return ({ children, ...props }: any) => (
      <AccumulatedComponents {...props}>
        <CurrentComponent {...props}>{children}</CurrentComponent>
      </AccumulatedComponents>
    );
  }, ({ children }) => <>{children}</>);
}
