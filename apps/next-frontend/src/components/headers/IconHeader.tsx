import NativeLanguage from '../elements/IconHeaderElements/NativeLanguage'
import MoneyBag from './MoneyBag'
const IconHeader = () => {
  return(
  <header className="grid grid-cols-2 justify-between items-center" data-cy="icon-header">
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
