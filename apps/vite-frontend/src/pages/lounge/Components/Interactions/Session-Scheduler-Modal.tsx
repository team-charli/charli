//Session-Scheduler-Modal.tsx
import * as React from "react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AnalogDigitalTimePicker } from "./Time-Picker";
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

interface DayPickerProps {
  selectedDay: string | null;
  onSelect: (day: string) => void;
}

function DayPicker({ selectedDay, onSelect }: DayPickerProps) {
  const weekdays = getUpcomingWeekdays()

  return (
    <div className="flex flex-col gap-3 pt-6">
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          className={cn(
            "h-12 rounded-full bg-[#6B5B95] text-lg font-normal text-white hover:bg-[#5d4f82]",
            selectedDay === "Today" && "bg-[#5d4f82]"
          )}
          onClick={() => onSelect("Today")}
        >
          Today
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "h-12 rounded-full bg-[#6B5B95] text-lg font-normal text-white hover:bg-[#5d4f82]",
            selectedDay === "Tomorrow" && "bg-[#5d4f82]"
          )}
          onClick={() => onSelect("Tomorrow")}
        >
          Tomorrow
        </Button>
      </div>

      <Separator className="my-2 bg-gray-300" />

      {/* Next 5 weekdays */}
      <div className="flex flex-col gap-2">
        {weekdays.map((day) => (
          <Button
            key={day}
            variant="ghost"
            className={cn(
              "h-10 rounded-full bg-[#6B5B95] text-base font-normal text-white hover:bg-[#5d4f82]",
              selectedDay === day && "bg-[#5d4f82]"
            )}
            onClick={() => onSelect(day)}
          >
            {day}
          </Button>
        ))}
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
}

export function TimePicker({
  userName,
  sessionDuration,
  date,
  onSelect,
  isToday
}: TimePickerProps) {
  // For simplicity, store the time in a local string state (e.g. "12:00 AM")
  const [timeString, setTimeString] = React.useState("12:00 AM");

  return (
    <div className="flex flex-col space-y-8 w-full max-w-md mx-auto mt-4">
      <div className="space-y-2">
        <div className="flex flex-col items-center gap-4">
          <AnalogDigitalTimePicker
            value={timeString}
            onChange={(newVal) => setTimeString(newVal)}
            isToday={isToday}
          />
        </div>
      </div>

      <p className="text-lg">
        Charli with {userName} at <strong>{timeString}</strong> on {date} for {sessionDuration}
      </p>

      <div className="flex justify-end">
        <Button
          onClick={() => onSelect(timeString)}
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

function DurationPicker({ selectedDuration, onSelect }: DurationPickerProps) {
  const durations = ["1 hour", "45 minutes", "30 minutes"]
  const shorterRow = ["20 minutes", "Custom"]

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className="flex flex-col gap-3">
        {durations.map((duration) => (
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

      <div className="flex gap-3 justify-around">
        {shorterRow.map((duration) => (
          <Button
            key={duration}
            variant="ghost"
            className={cn(
              "h-12 px-6 rounded-full bg-[#6B5B95] text-lg font-normal text-white hover:bg-[#5d4f82]",
              selectedDuration === duration && "bg-[#5d4f82]"
            )}
            onClick={() => onSelect(duration)}
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
          onClick={onConfirm}
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
  //TODO: handle X reset state.
  // Which screen to render
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
            onSelect={(time) => {
              setSelectedTime(time)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("w-[400px] h-[600px] rounded-3xl border-0 bg-[#F5F5F5] p-6 shadow-xl")}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-medium">
            {getTitle()}
          </DialogTitle>
        </DialogHeader>
        {renderScreen()}
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

