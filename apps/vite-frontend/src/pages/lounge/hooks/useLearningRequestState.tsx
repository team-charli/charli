// useLearningRequestState.tsx

import { useEffect, useMemo, useState } from "react"
import { BigNumberish, ethers } from "ethers"
import { formatDateTimeLocal } from "@/utils/app"
import { usePreCalculateTimeDate } from "./usePreCalculateTimeDate"

const DURATION_MAP: Record<string, number> = {
  "1 hour": 60,
  "45 minutes": 45,
  "30 minutes": 30,
  "20 minutes": 20,
  "4 minutes": 4,    // <--- TEST
  custom: 20,
};

function combineDayAndTime(day: string, timeStr: string): Date {
  const now = new Date()
  if (day === "Tomorrow") now.setDate(now.getDate() + 1)
  if (day !== "Today" && day !== "Tomorrow") {
    // optionally handle Sunday/Monday, etc.; else do nothing
  }
  const parts = timeStr.trim().match(/^(\d{1,2}):(\d{1,2})\s?(AM|PM)?$/i)
  if (!parts) return now
  let hour = parseInt(parts[1], 10)
  const minute = parseInt(parts[2], 10)
  const period = (parts[3] || "AM").toUpperCase()
  if (period === "PM" && hour < 12) hour += 12
  if (period === "AM" && hour === 12) hour = 0
  now.setHours(hour, minute, 0, 0)
  return now
}

export const useLearningRequestState = () => {
  const [toggleDateTimePicker, setToggleDateTimePicker] = useState(false)
  const [sessionLengthInputValue, setSessionLengthInputValue] = useState("20")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [schedulerStep, setSchedulerStep] = useState(1)
  const [renderSubmitConfirmation, setRenderSubmitConfirmation] = useState(false)

  const sessionDuration = useMemo(() => {
    const lower = sessionLengthInputValue.toLowerCase().trim()
    if (DURATION_MAP[lower] !== undefined) return DURATION_MAP[lower]
    const numeric = parseInt(lower, 10)
    if (!isNaN(numeric)) return numeric
    return 20
  }, [sessionLengthInputValue])

  const amountUsdc: BigNumberish = useMemo(() => {
    return ethers.parseUnits(String(sessionDuration * 0.3), 18)
  }, [sessionDuration])

  const { dateTime, setDateTime } = usePreCalculateTimeDate()

  useEffect(() => {
    if (!selectedDay || !selectedTime) return
    const merged = combineDayAndTime(selectedDay, selectedTime)
    setDateTime(formatDateTimeLocal(merged))
  }, [selectedDay, selectedTime, setDateTime])

  return {
    toggleDateTimePicker,
    setToggleDateTimePicker,
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
    amountUsdc,
  }
}
