### Steps to Integrate Routing in Next.js with TypeScript

#### 1. **Setup File-Based Routes**

In a TypeScript project, you'll use `.tsx` for React components. Here’s how you can set up the routes using Next.js’s file-based routing system:

- **Root (`/`)**: Use `pages/index.tsx` for the Entry component.
- **Login (`/login` and `/signup`)**: Use `pages/login.tsx` for the Login component.
- **Onboard (`/onboard`)**: Use `pages/onboard.tsx` for the Onboard component.
- **Bolsa (`/bolsa`)**: Use `pages/bolsa.tsx` for the Bolsa component.
- **Lounge (`/lounge`)**: Use `pages/lounge.tsx` for the Lounge component.
- **Room (`/room/[id]`)**: Use `pages/room/[id].tsx` for dynamic room ID handling.

#### 2. **Migrate Components to Their Respective Files**

Create the respective `.tsx` files under the `pages` directory. For example:

- **pages/index.tsx**
  ```typescript
  import Entry from '../src/Routes/Entry';
  export default function Home() {
      return <Entry />;
  }
  ```

- **pages/login.tsx**
  ```typescript
  import Login from '../src/Routes/Auth/Login';
  export default function LoginPage() {
      return <Login />;
  }
  ```

- **pages/onboard.tsx**
  ```typescript
  import Onboard from '../src/Routes/Onboard/Onboard';
  export default function OnboardPage() {
      return <Onboard />;
  }
  ```

#### 3. **Handle Private Routes**

Next.js doesn't automatically provide private route functionality. You manage access using a higher-order component (HOC) or by including the logic directly in the page components:

- **Create a Higher-Order Component for Authentication**
  ```typescript
  // components/PrivateRoute.tsx
  import { useEffect } from 'react';
  import { useRouter } from 'next/router';
  import { useAuthContext } from '../contexts/AuthContext';
  import { useOnboardContext } from '../contexts/OnboardContext';

  const PrivateRoute = (Component: React.ComponentType<any>) => {
      return function WithPrivateRoute(props: any) {
          const router = useRouter();
          const { currentAccount, sessionSigs } = useAuthContext();
          const { isOnboarded } = useOnboardContext();
          const isAuthenticated = Boolean(currentAccount && sessionSigs);

          useEffect(() => {
              if (!isAuthenticated) {
                  router.push('/login');
              } else if (!isOnboarded) {
                  router.push('/onboard');
              }
          }, [isAuthenticated, isOnboarded, router]);

          return isAuthenticated && isOnboarded ? <Component {...props} /> : null;
      };
  };

  export default PrivateRoute;
  ```

- **Use the HOC in Pages**
  ```typescript
  // pages/lounge.tsx
  import Lounge from '../src/Routes/Lounge/Lounge';
  import PrivateRoute from '../components/PrivateRoute';
  export default PrivateRoute(Lounge);
  ```

#### 4. **Dynamic Routes**

For dynamic routes such as `/room/:id`, define them using the folder and file structure:

- **pages/room/[id].tsx**
  ```typescript
  import { useRouter } from 'next/router';
  import Room from '../../src/Routes/Room/Room';

  const RoomPage = () => {
      const router = useRouter();
      const { id } = router.query;

      return <Room id={id as string} />;
  };

  export default RoomPage;
  ```

This setup should adequately replicate the routing functionality you had with Vite and React Router in your Next.js application, adapting it to the idiomatic Next.js file-based routing and server-side features. Be sure to adjust paths and imports based on your actual project structure and ensure all context providers and hooks are adapted to Next.js's server-side capabilities. Additionally, ensure you have set up your TypeScript configuration correctly in Next.js, which typically involves adjusting `tsconfig.json` to match your project’s needs.
