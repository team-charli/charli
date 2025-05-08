import MoneyMeter from "./MoneyMeter";
import StopWatch from "./StopWatch";
import SwapSpeakerButton from "./SwapSpeakerButton";

const ControlRibbon = () => {
  return (
    <div className="w-full bg-white border-b border-gray-200 py-2 sm:py-3 md:py-4 px-3 sm:px-4 md:px-6 
                  flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 
                  shadow-sm">
      <div className="w-full sm:w-auto">
        <SwapSpeakerButton />
      </div>
      
      <div className="w-full sm:w-auto flex justify-center order-first sm:order-none">
        <StopWatch />
      </div>
      
      <div className="w-full sm:w-auto">
        <MoneyMeter />
      </div>
    </div>
  )
}

export default ControlRibbon;
