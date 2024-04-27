import { useEffect } from 'react';
import { useRouter } from 'next/router';

interface ClientSideRedirectProps {
  to: string;
}

const ClientSideRedirect: React.FC<ClientSideRedirectProps> = ({ to }) => {
  const router = useRouter();

  useEffect(() => {
    console.log(`push ${to}`)
    router.push(to);
  }, [to, router]);

  return null;  // Render nothing while redirecting
};

export default ClientSideRedirect;
