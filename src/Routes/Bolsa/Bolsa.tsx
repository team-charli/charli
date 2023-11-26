import UturnModal from '../../Components/Elements/UturnModal'
import IconHeader from "../../Components/Headers/IconHeader"
import { useIsOnboarded } from '../../hooks/useIsOnboarded'
import { AuthContext } from '../../contexts/AuthContext'
import { useContextNullCheck } from '../../hooks/utils/useContextNullCheck'
import { Redirect} from 'react-router-dom'

const Bolsa = () => {
  const {isAuthenticated} = useContextNullCheck(AuthContext);
  const isOnboarded: boolean|null = useIsOnboarded()
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

