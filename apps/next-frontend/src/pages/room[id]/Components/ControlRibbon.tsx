import MoneyMeter from "./MoneyMeter";
import StopWatch from "./StopWatch";
import SwapSpeakerButton from "./SwapSpeakerButton";

const ControlRibbon = () => {
  return (

    <div className="__Control-Ribbon__">
      <SwapSpeakerButton />
      <StopWatch />
      <MoneyMeter />
    </div>
  )
}

export default ControlRibbon;
