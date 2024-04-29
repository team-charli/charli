import useLocalStorage from '@rehooks/local-storage'
import { IRelayPKP, SessionSigs } from '@lit-protocol/types'
import UturnModal from '@/components/elements/UturnModal';
import IconHeader from '@/components/headers/IconHeader';
import { useRouter } from 'next/router';


const Bolsa = () => {
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs');
  const [ isOnboarded ] = useLocalStorage<boolean>('isOnboarded');
  const isAuthenticated = currentAccount && sessionSigs;
  const router = useRouter();

  let modal
  if (isOnboarded && isAuthenticated) {
    modal = null;
  } else if (!isAuthenticated && isOnboarded) {
    modal = <UturnModal />
  } else if (isAuthenticated && !isOnboarded) {
    modal = null;
    router.push("/onboard")
      .catch((error) => {
        console.log(error);
        throw new Error('pushing to /onboard error?')
        // Handle any errors that occurred during navigation
      });

  }

  return (
    <>
      <IconHeader />
      <div className="_bolsa-content-container_ flex justify-center">
        <p className="_tux-lady_ text-7xl mt-32">🤵‍♀️</p>
        {modal}
      </div>
      {}
    </>
  )
}

export default Bolsa


//TODO: Add Screen 3.2 (coin logos)


