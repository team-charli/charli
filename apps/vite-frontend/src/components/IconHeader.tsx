import NativeLanguage from "./elements/IconHeaderElements/NativeLanguage"
import MoneyBag from "./headers/MoneyBag"

const IconHeader = () => {
  return(
  <header className="grid grid-cols-1 items-center gap-y-3 w-full px-3 py-3 sm:grid-cols-2 sm:justify-between sm:gap-y-0 sm:px-5 sm:py-4 md:px-8 md:py-5 lg:px-10 lg:py-6">
    <div className="__bag-emoji__ flex justify-center sm:justify-start">
      <div className="scale-90 sm:scale-100 md:scale-110 lg:scale-125">
        <MoneyBag />
      </div>
    </div>
    <div className="__listbox-container__ relative flex justify-center sm:justify-end">
      <div className="w-full max-w-[240px] sm:max-w-[280px] md:max-w-[320px] lg:max-w-[360px]">
        <NativeLanguage />
      </div>
    </div>
  </header>
  )
}
export default IconHeader

