//useLearningRequestState.tsx
import { BigNumberish, ethers } from "ethers";
import { useMemo, useState } from "react";
import { usePreCalculateTimeDate } from "./usePreCalculateTimeDate";


export const useLearningRequestState = () => {
  const [toggleDateTimePicker, setToggleDateTimePicker] = useState(false);
  const [sessionLengthInputValue, setSessionLengthInputValue] = useState<string>("20");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null); // optional if you want to store raw time string
  const [schedulerStep, setSchedulerStep] = useState<number>(1); // e.g. step 1=Day, 2=Time, 3=Duration

  const [renderSubmitConfirmation, setRenderSubmitConfirmation] = useState(false);

  const sessionDuration = useMemo(
    () => (sessionLengthInputValue ? parseInt(sessionLengthInputValue) : 0),
    [sessionLengthInputValue]
  );

  const amountDai = useMemo(
    () => ethers.parseUnits(String(sessionDuration * 0.3), 18) as BigNumberish,
    [sessionDuration]
  );

  const { dateTime, setDateTime } = usePreCalculateTimeDate();

  return {
    toggleDateTimePicker,
    setToggleDateTimePicker,

    // For the stepped modal screens
    schedulerStep,
    setSchedulerStep,
    selectedDay,
    setSelectedDay,
    selectedTime,
    setSelectedTime,

    sessionLengthInputValue,
    setSessionLengthInputValue,
    renderSubmitConfirmation,
    setRenderSubmitConfirmation,
    dateTime,
    setDateTime,
    sessionDuration,
    amountDai,
  }
}
