import NativeLanguage from './IconHeaderElements/NativeLanguage'
import MoneyBag from './MoneyBag'
const IconHeader = () => {
  return(
  <div className="flex justify-between w-full">
    <MoneyBag />
    <NativeLanguage />
  </div>
  )
}
export default IconHeader
