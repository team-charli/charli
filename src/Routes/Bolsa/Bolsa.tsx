import UturnModal from '../../Components/Elements/UturnModal'
import IconHeader from "../../Components/Headers/IconHeader"
import { useIsOnboarded } from '../../hooks/useIsOnboarded'

const Bolsa = () => {
  const isOnboarded: boolean|null = useIsOnboarded()
  const onBoardedMessage = "";
  //TODO: Add Screen 3.2 (coin logos)
  return (
    <>
      <IconHeader />
      <div className="_bolsa-content-container_ flex justify-center">
        <p className="_tux-lady_ text-7xl mt-32">🤵‍♀️</p>
      </div>
        {isOnboarded ? <p>{onBoardedMessage}</p> :
          <UturnModal />
        }
    </>
  )
}

export default Bolsa
