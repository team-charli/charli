import {useState, useMemo} from 'react'
import { usePreCalculateTimeDate } from './usePreCalculateTimeDate';
import { BigNumberish } from 'ethers';

  export const useLearningRequestState = () => {
  const [sessionLengthInputValue, setSessionLengthInputValue] = useState<string>("20");
    const [toggleDateTimePicker, setToggleDateTimePicker] = useState(false);
    const [renderSubmitConfirmation, setRenderSubmitConfirmation] = useState(false);
    const { dateTime, setDateTime } = usePreCalculateTimeDate();
    const sessionDuration = useMemo(() =>
      sessionLengthInputValue ? parseInt(sessionLengthInputValue) : 0,
      [sessionLengthInputValue]
    );

    const amount = useMemo(() => sessionDuration * 0.3 as BigNumberish, [sessionDuration]);


    return {sessionLengthInputValue, setSessionLengthInputValue, toggleDateTimePicker, setToggleDateTimePicker, renderSubmitConfirmation, setRenderSubmitConfirmation,  dateTime, setDateTime, sessionDuration, amount }
  }

