//Session-Scheduler-Modal.tsx
import * as React from "react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AnalogDigitalTimePicker } from "./Time-Picker";
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"


function DayPicker({ selectedDay, onSelect }: DayPickerProps) {
  const weekdays = getUpcomingWeekdays()

  return (
    <div className="flex flex-col gap-2 sm:gap-3 pt-3 sm:pt-4 md:pt-6">
      <div className="flex flex-col gap-2 sm:gap-3">
        <Button
          variant="ghost"
          className={cn(
            "h-10 sm:h-11 md:h-12 rounded-full bg-[#6B5B95] text-base sm:text-lg font-normal text-white hover:bg-[#5d4f82] transition-colors shadow-sm",
            selectedDay === "Today" && "bg-[#5d4f82]"
          )}
          onClick={() => onSelect("Today")}
        >
          <div className="flex items-center">
            <span className="mr-2">Today</span>
            <span className="text-xs opacity-75">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "h-10 sm:h-11 md:h-12 rounded-full bg-[#6B5B95] text-base sm:text-lg font-normal text-white hover:bg-[#5d4f82] transition-colors shadow-sm",
            selectedDay === "Tomorrow" && "bg-[#5d4f82]"
          )}
          onClick={() => onSelect("Tomorrow")}
        >
          <div className="flex items-center">
            <span className="mr-2">Tomorrow</span>
            <span className="text-xs opacity-75">
              {new Date(Date.now() + 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </Button>
      </div>

      <Separator className="my-2 sm:my-3 bg-gray-300" />

      {/* Next 5 weekdays */}
      <div className="flex flex-col gap-1.5 sm:gap-2 md:gap-2.5">
        {weekdays.map((day) => {
          // Calculate the date for this weekday
          const today = new Date();
          const dayIndex = today.getDay();
          const daysFromToday = (days.indexOf(day) - dayIndex + 7) % 7;
          const dayDate = new Date(today.getTime() + (daysFromToday + 2) * 86400000); // +2 to start after tomorrow
          
          return (
            <Button
              key={day}
              variant="ghost"
              className={cn(
                "h-9 sm:h-10 md:h-11 rounded-full bg-[#6B5B95] text-sm sm:text-base font-normal text-white hover:bg-[#5d4f82] transition-colors shadow-sm",
                selectedDay === day && "bg-[#5d4f82]"
              )}
              onClick={() => onSelect(day)}
            >
              <div className="flex items-center justify-between w-full px-2">
                <span>{day}</span>
                <span className="text-xs opacity-75">
                  {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  )
}

export interface TimePickerProps {
  userName: string;
  sessionDuration: string;
  date: string;
  onSelect: (timeString: string) => void;
  isToday?: boolean;
  value: string;
  onTimeChange: (newVal: string) => void;
}

export function TimePicker({
  userName,
  sessionDuration,
  date,
  onSelect,
  isToday,
  value,
  onTimeChange,
}: TimePickerProps) {
  // For simplicity, store the time in a local string state (e.g. "12:00 AM")
  const [hasSeenMinute, setHasSeenMinute] = React.useState(false);

  const [forceMinute, setForceMinute] = React.useState(false);

  return (
    <div className="flex flex-col space-y-8 w-full max-w-md mx-auto mt-4">
      <div className="space-y-2">
        <div className="flex flex-col items-center gap-4">
          <AnalogDigitalTimePicker
            value={value}
            onChange={onTimeChange}
            isToday={isToday}
            forceMinute={forceMinute} // NEW: pass the “force minute” flag
            onModeChange={(newMode) => {
              if (newMode === "minute") {
                setHasSeenMinute(true);
              }
              setForceMinute(false);
            }}
          />
        </div>
      </div>

      <p className="text-lg">
        Charli with {userName} at <strong>{value}</strong> on {date} for {sessionDuration}
      </p>

      <div className="flex justify-end">
        <Button
          onClick={() => {
            // If user has never seen minute mode, flip the child to minute mode
            if (!hasSeenMinute) {
              setForceMinute(true);
              return;
            }
            // Otherwise, if they’ve already seen minute mode, proceed:
            console.log("final timeString which will be submitted to db", value);
            onSelect(value);
          }}
          className="rounded-full bg-[#6B5B95] text-white hover:bg-[#5d4f82]"
        >
          Next
        </Button>
      </div>
    </div>
  );
}


interface DurationPickerProps {
  selectedDuration: string
  onSelect: (duration: string) => void
}

export function DurationPicker({
  selectedDuration,
  onSelect,
}: DurationPickerProps) {
  // Standard production durations
  const standardDurations = ["1 hour", "45 minutes", "30 minutes"]
  // Second row
  const secondRowDurations = ["20 minutes", "Custom"]
  // Third row for “4 minutes” testing
  const testRowDurations = ["4 minutes"]

  // Local state for handling the custom input mode
  const [showCustomInput, setShowCustomInput] = React.useState(false)
  const [customMinutes, setCustomMinutes] = React.useState("20")
  const [errorMessage, setErrorMessage] = React.useState("")

  function handleCustomClick() {
    setShowCustomInput(true)
    setErrorMessage("")
  }

  function handleCustomSubmit() {
    const numericVal = parseInt(customMinutes, 10)

    // Validate numeric input:
    if (isNaN(numericVal)) {
      setErrorMessage("Please enter a valid number.")
      return
    }
    if (numericVal < 20) {
      setErrorMessage("Custom duration must be at least 20 minutes.")
      return
    }

    // Clear errors and send numeric value back to parent
    setErrorMessage("")
    onSelect(String(numericVal))

    // Hide the input & reset local state
    setShowCustomInput(false)
    setCustomMinutes("20")
  }

  // If "Custom" is clicked, render the input sub-view
  if (showCustomInput) {
    return (
      <div className="flex flex-col gap-4 mt-4">
        <p>Enter your custom duration in minutes (minimum 20):</p>
        <div className="flex items-center space-x-2">
          <Input
            type="number"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            className="w-[120px]"
          />
          <Button
            onClick={handleCustomSubmit}
            className="rounded-full bg-[#6B5B95] text-white hover:bg-[#5d4f82]"
          >
            Set Duration
          </Button>
        </div>
        {errorMessage && (
          <p className="text-red-500 text-sm mt-1">
            {errorMessage}
          </p>
        )}
      </div>
    )
  }

  // Otherwise, show the three rows:
  return (
    <div className="flex flex-col gap-4 mt-4">
      {/* Row 1 */}
      <div className="flex flex-col gap-3">
        {standardDurations.map((duration) => (
          <Button
            key={duration}
            variant="ghost"
            className={cn(
              "h-12 rounded-full bg-[#6B5B95] text-lg font-normal text-white hover:bg-[#5d4f82]",
              selectedDuration === duration && "bg-[#5d4f82]"
            )}
            onClick={() => onSelect(duration)}
          >
            {duration}
          </Button>
        ))}
      </div>

      <Separator className="my-2 bg-gray-300" />

      {/* Row 2 */}
      <div className="flex gap-3 justify-around">
        {secondRowDurations.map((duration) => {
          if (duration === "Custom") {
            return (
              <Button
                key={duration}
                variant="ghost"
                onClick={handleCustomClick}
                className={cn(
                  "h-12 px-6 rounded-full bg-[#6B5B95] text-lg font-normal text-white hover:bg-[#5d4f82]",
                  selectedDuration === duration && "bg-[#5d4f82]"
                )}
              >
                {duration}
              </Button>
            )
          }
          return (
            <Button
              key={duration}
              variant="ghost"
              onClick={() => onSelect(duration)}
              className={cn(
                "h-12 px-6 rounded-full bg-[#6B5B95] text-lg font-normal text-white hover:bg-[#5d4f82]",
                selectedDuration === duration && "bg-[#5d4f82]"
              )}
            >
              {duration}
            </Button>
          )
        })}
      </div>

      <Separator className="my-2 bg-gray-300" />

      {/* Row 3 (Test) */}
      <div className="flex gap-3 justify-around">
        {testRowDurations.map((duration) => (
          <Button
            key={duration}
            variant="ghost"
            onClick={() => onSelect(duration)}
            className={cn(
              "h-12 px-6 rounded-full bg-[#6B5B95] text-lg font-normal text-white hover:bg-[#5d4f82]",
              selectedDuration === duration && "bg-[#5d4f82]"
            )}
          >
            {duration}
          </Button>
        ))}
      </div>
    </div>
  )
}


interface ConfirmSessionProps {
  userName: string
  date: string
  sessionDuration: number
  daiAmount: string
  onConfirm: () => Promise<void>
}

function ConfirmSession({ userName, date, sessionDuration, daiAmount, onConfirm }: ConfirmSessionProps) {
  // Track whether the "Confirm" button has been clicked
  const [confirmDisabled, setConfirmDisabled] = React.useState(false);

  const tooltipContent = (
    <div className="max-w-sm">
      <p className="font-semibold mb-2">Frozen: If you click "confirm" below Charli</p>
      <ol className="list-decimal pl-4 space-y-2">
        <li>Creates a neutral Ethereum address we call the Controller</li>
        <li>Asks your Charli Wallet to ERC-720 Permit the session cost for our Ethereum transaction Relayer</li>
        <li>
          <em>When the teacher confirms your session</em> that Controller account (now an actual account not just a pre-generated address) is created <strong>then burned</strong>.
          Burning the Controller account means that the Controller account <strong>can't transfer to anyone except you or the teacher</strong>
        </li>
        <li>Session cost is transferred to the Controller</li>
        <li>Funds stay in the Controller until Session is Finalized.</li>
        <li>
          <strong>
            This is how Charli ensures everybody honors their commitments. If the teacher doesn't deliver- you get your money back.
            If you (the learner) - don't show up to the session after the teacher confirms your request - the teacher still gets paid.
          </strong>
        </li>
      </ol>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 mt-4">
      <p className="text-lg">
        Confirm Charli with {userName} on {date} for {sessionDuration} minutes?
      </p>

      <p className="text-base">
        After {userName} confirms your session, {daiAmount} will be{" "}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="text-blue-600 underline">
              frozen
            </TooltipTrigger>
            <TooltipContent side="right" className="p-4 max-w-[350px]">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        . For now after you press confirm the funds will remain in your Charli Wallet until {userName} officially confirms your session.
      </p>

      <div className="mt-6 flex justify-end">
        <Button
          disabled={confirmDisabled}
          onClick={async () => {
            setConfirmDisabled(true);
            await onConfirm();
          }}
          className="rounded-full bg-[#6B5B95] text-white hover:bg-[#5d4f82]"
        >
          Confirm
        </Button>
      </div>
    </div>
  )
}

interface SessionSchedulerModalProps {
  // 1) open/close logic
  open: boolean
  onOpenChange: (open: boolean) => void

  // 2) step-based logic
  step: number
  setStep: React.Dispatch<React.SetStateAction<number>>

  // 3) day/time from parent
  selectedDay: string | null
  setSelectedDay: React.Dispatch<React.SetStateAction<string | null>>

  selectedTime: string | null
  setSelectedTime: React.Dispatch<React.SetStateAction<string | null>>

  // 4) If you store dateTime in the parent, only keep these if actually used
  // Remove them if you aren’t combining day/time inside the modal
  // dateTime: Date | null
  // setDateTime: React.Dispatch<React.SetStateAction<Date | null>>

  // 5) The parent’s input value for duration (always string here)
  sessionLengthInputValue: string
  setSessionLengthInputValue: React.Dispatch<React.SetStateAction<string>>

  // 6) Possibly a derived numeric from sessionLengthInputValue
  //    We'll just use it for debugging or skip if not needed
  sessionDuration: number

  userName: string
  handleSubmitLearningRequest: any
}

export function SessionSchedulerModal({
  open,
  onOpenChange,
  step,
  setStep,
  selectedDay,
  setSelectedDay,
  selectedTime,
  setSelectedTime,
  sessionLengthInputValue,
  setSessionLengthInputValue,
  sessionDuration,
  userName,
  handleSubmitLearningRequest,
}: SessionSchedulerModalProps) {
  // Provide fallback strings for day/time/duration if null or 0
  const dateLabel = selectedDay ?? "Unselected date"
  const durationLabel = `${sessionDuration} minutes`

  const handleClose = () => {
    onOpenChange(false)
    setStep(1)
    setSelectedDay(null)
    setSelectedTime(null)
    // Reset the parent's session length to a default (optional):
    setSessionLengthInputValue("20")
  }

  const handleConfirmSubmission = async () => {
    try {
      // If you eventually want to produce a real Date from day/time,
      // you can do that here or in the parent.
      await handleSubmitLearningRequest();
      handleClose();
    } catch (error) {
      console.error("Failed to submit learning request:", error);
    }
  }

  const getTitle = () => {
    switch (step) {
      case 3: return "SessionLength"
      case 4: return "Confirm"
      default: return "When?"
    }
  }
  const renderScreen = () => {
    switch (step) {
      case 1:
        return (
          <DayPicker
            selectedDay={selectedDay}
            onSelect={(day) => {
              setSelectedDay(day)
              setStep(2)
            }}
          />
        )
      case 2:
        return (
          <TimePicker
            userName={userName}
            sessionDuration={durationLabel}
            date={dateLabel}
            isToday={selectedDay === 'Today'}
            value={selectedTime || "12:00 AM"}
            onTimeChange={(newVal) => setSelectedTime(newVal)}
            onSelect={(time) => {
              setSelectedTime(time) // safe to re-assign
              setStep(3)
            }}
          />
        )
      case 3:
        return (
          <DurationPicker
            selectedDuration={sessionLengthInputValue}
            onSelect={(duration) => {
              setSessionLengthInputValue(duration)
              setStep(4)
            }}
          />
        )
      case 4:
        return (
          <ConfirmSession
            userName={userName}
            date={dateLabel}
            sessionDuration={sessionDuration}
            daiAmount={`${(sessionDuration * 0.3).toFixed(2)} DAI`}
            onConfirm={handleConfirmSubmission}
          />
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={(openState) => { if (!openState) { handleClose(); } onOpenChange(openState); }}>
      <DialogContent
        className={cn(
          "w-[90vw] sm:w-[400px] md:w-[450px] lg:w-[500px]",
          "h-[80vh] sm:h-[600px] md:h-[650px]",
          "max-h-[90vh]",
          "rounded-xl sm:rounded-2xl md:rounded-3xl",
          "border-0 bg-[#F5F5F5]",
          "p-4 sm:p-5 md:p-6",
          "shadow-xl"
        )}
      >
        <DialogHeader className="mb-2 sm:mb-3 md:mb-4">
          <DialogTitle className="text-center text-xl sm:text-2xl md:text-3xl font-medium">
            {getTitle()}
          </DialogTitle>
          <div className="flex justify-center mt-1 sm:mt-2">
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
              <div className={`h-2 w-2 rounded-full ${step >= 1 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
              <div className={`h-2 w-2 rounded-full ${step >= 2 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
              <div className={`h-2 w-2 rounded-full ${step >= 3 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
              <div className={`h-2 w-2 rounded-full ${step >= 4 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto px-1 flex-grow max-h-[calc(80vh-100px)] sm:max-h-[450px]">
          {renderScreen()}
        </div>
        
        {step > 1 && (
          <div className="mt-4 sm:mt-5 flex justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(step - 1)}
              className="text-xs sm:text-sm rounded-full px-3 py-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
function getUpcomingWeekdays() {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const today = new Date()
  const dayIndex = today.getDay()

  const weekdays: string[] = []
  let currentIndex = (dayIndex + 2) % 7 // Start from day after tomorrow

  for (let i = 0; i < 5; i++) {
    weekdays.push(days[currentIndex])
    currentIndex = (currentIndex + 1) % 7
  }
  return weekdays
}

interface DayPickerProps {
  selectedDay: string | null;
  onSelect: (day: string) => void;
}

interface DurationPickerProps {
  selectedDuration: string
  onSelect: (duration: string) => void
}

