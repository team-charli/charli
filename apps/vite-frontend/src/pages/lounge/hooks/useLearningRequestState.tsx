// useLearningRequestState.tsx
import { BigNumberish, ethers } from "ethers";
import { useMemo, useState } from "react";
import { usePreCalculateTimeDate } from "./usePreCalculateTimeDate";

/**
 * A dictionary from user-facing text to an integer minute count.
 * Adjust or expand as needed.
 */
const DURATION_MAP: Record<string, number> = {
  "1 hour": 60,
  "45 minutes": 45,
  "30 minutes": 30,
  "20 minutes": 20,
  // Possibly "custom" => 20, or any fallback you desire
  custom: 20,
};

export const useLearningRequestState = () => {
  const [toggleDateTimePicker, setToggleDateTimePicker] = useState(false);

  // Keep a string-based value so other files remain unchanged:
  const [sessionLengthInputValue, setSessionLengthInputValue] = useState<string>("20");

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [schedulerStep, setSchedulerStep] = useState<number>(1);
  const [renderSubmitConfirmation, setRenderSubmitConfirmation] = useState(false);

  /**
   * Convert the user’s string (e.g. "1 hour", "45 minutes", "20 minutes") to numeric minutes.
   *  - If we have a match in our dictionary (DURATION_MAP), use it.
   *  - Otherwise, parseInt(...) for a numeric fallback (e.g. "20" => 20).
   *  - If unparseable => default to 20 or 0.
   */
  const sessionDuration = useMemo(() => {
    const lower = sessionLengthInputValue.toLowerCase().trim();

    // 1) Check dictionary first:
    if (DURATION_MAP[lower] !== undefined) {
      return DURATION_MAP[lower];
    }

    // 2) Otherwise attempt parseInt (e.g. "20" => 20, "45" => 45)
    const numeric = parseInt(lower, 10);
    if (!isNaN(numeric)) {
      return numeric;
    }

    // 3) Fallback if parse fails
    return 20;
  }, [sessionLengthInputValue]);

  // cost = minutes × 0.3 -> parse to 18 decimals for on-chain usage:
  const amountDai: BigNumberish = useMemo(() => {
    const cost = sessionDuration * 0.3;
    // e.g. 60 minutes => 60 × 0.3 => 18.0 => parseUnits("18.0", 18)
    return ethers.parseUnits(String(cost), 18);
  }, [sessionDuration]);

  const { dateTime, setDateTime } = usePreCalculateTimeDate();

  return {
    toggleDateTimePicker,
    setToggleDateTimePicker,
    schedulerStep,
    setSchedulerStep,
    selectedDay,
    setSelectedDay,
    selectedTime,
    setSelectedTime,

    // Keep the same name and type so your existing code won't break:
    sessionLengthInputValue,
    setSessionLengthInputValue,

    renderSubmitConfirmation,
    setRenderSubmitConfirmation,

    dateTime,
    setDateTime,

    // Final integer minutes for that string
    sessionDuration,

    // On-chain cost in DAI (BigNumber)
    amountDai,
  };
};
