import UturnModal from '../../Components/Elements/UturnModal'
import IconHeader from "../../Components/Headers/IconHeader"
import { Redirect} from 'react-router-dom'
import useLocalStorage from '@rehooks/local-storage'
import { IRelayPKP, SessionSigs } from '@lit-protocol/types'

const Bolsa = () => {
  const [ currentAccount ] = useLocalStorage<IRelayPKP>('currentAccount');
  const [ sessionSigs ] = useLocalStorage<SessionSigs>('sessionSigs');
  const [ isOnboarded ] = useLocalStorage<boolean>('isOnboarded');
  const isAuthenticated = currentAccount && sessionSigs;

  let modal
  if (isOnboarded && isAuthenticated) {
    modal = null;
  } else if (!isAuthenticated && isOnboarded) {
    modal = <UturnModal />
  } else if (isAuthenticated && !isOnboarded) {
    modal = <Redirect to="/onboard" />
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

