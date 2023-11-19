import NativeLanguage from './IconHeaderElements/NativeLanguage'
import MoneyBag from './MoneyBag'
const IconHeader = () => {
  return(
  <header className="grid grid-cols-2 justify-between items-center ">
    <div className="__bag-emoji__">
      <MoneyBag />
    </div>
    <div className="__listbox-container__ relative ml-auto">
    <NativeLanguage />
    </div>
  </header>
  )
}
export default IconHeader
