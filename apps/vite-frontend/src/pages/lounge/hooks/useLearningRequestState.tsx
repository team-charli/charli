import { BigNumberish, ethers } from "ethers";
import { useMemo, useState } from "react";
import { usePreCalculateTimeDate } from "./usePreCalculateTimeDate";

export const useLearningRequestState = () => {
  const [toggleDateTimePicker, setToggleDateTimePicker] = useState(false);
  const [sessionLengthInputValue, setSessionLengthInputValue] = useState<string>("20");
  const [renderSubmitConfirmation, setRenderSubmitConfirmation] = useState(false);

  const sessionDuration = useMemo(() =>
    sessionLengthInputValue ? parseInt(sessionLengthInputValue) : 0,
    [sessionLengthInputValue]
  );

  const amountDai = useMemo(() => ethers.parseUnits(String(sessionDuration * 0.3), 18) as BigNumberish, [sessionDuration]);
  const { dateTime, setDateTime } = usePreCalculateTimeDate();

  return {
    sessionLengthInputValue,
    setSessionLengthInputValue,
    toggleDateTimePicker,
    setToggleDateTimePicker,
    renderSubmitConfirmation,
    setRenderSubmitConfirmation,
    dateTime,
    setDateTime,
    sessionDuration,
    amountDai,
  }
}
