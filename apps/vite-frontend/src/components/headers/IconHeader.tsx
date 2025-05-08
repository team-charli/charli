import NativeLanguage from '../elements/IconHeaderElements/NativeLanguage'
import MoneyBag from './MoneyBag'
const IconHeader = () => {
  return(
    <header className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 sm:gap-y-0 justify-between items-center p-3 sm:p-4 md:p-5 lg:p-6">
      <div className="__bag-emoji__ flex justify-center sm:justify-start">
        <div className="scale-90 sm:scale-100 md:scale-110 lg:scale-120">
          <MoneyBag />
        </div>
      </div>
      <div className="__listbox-container__ relative flex justify-center sm:justify-end">
        <NativeLanguage />
      </div>
    </header>
  )
}
export default IconHeader
