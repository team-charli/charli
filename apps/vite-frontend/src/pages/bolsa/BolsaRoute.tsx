//UturnModal.tsx
import IconHeader from '@/components/headers/IconHeader';
import { useIsLitLoggedIn, useIsOnboarded } from '@/contexts/AuthContext';
import { redirect } from '@tanstack/react-router';
import UturnModal from '@/components/elements/UturnModal';


const BolsaRoute = () => {
  const { data: isOnboarded } = useIsOnboarded();
  const { data: isLitLoggedIn } = useIsLitLoggedIn();
  let modal
  if (isOnboarded && isLitLoggedIn) {
    modal = null;
  } else if (!isLitLoggedIn && isOnboarded) {
    modal = <UturnModal />
  } else if (isLitLoggedIn && !isOnboarded) {
    modal = null;
    console.log('push to /onboard');
    throw redirect({to:"/onboard" } )
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

export default BolsaRoute


//TODO: Add Screen 3.2 (coin logos)


