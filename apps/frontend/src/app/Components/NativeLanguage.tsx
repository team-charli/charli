import { useContextNullCheck } from  '../hooks/useContextNullCheck'
import { StateContext } from '../contexts/StateContext'

const NativeLanguage = () => {
  const { setNativeLang } = useContextNullCheck(StateContext);
  return (
   //TODO: implement setNativeLang (form)
    <div>🌐</div>
  )
}

export default NativeLanguage
