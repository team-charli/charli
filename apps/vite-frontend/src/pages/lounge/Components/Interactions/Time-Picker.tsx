import { useState, useEffect } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import "./TimePicker.css"

interface TimePickerProps {
  userName: string
  sessionDuration: string
  date: string
  onConfirm: (time: string) => void
}

export function TimePicker({ userName, sessionDuration, date, onConfirm }: TimePickerProps) {
  const [hours, setHours] = useState(12)
  const [minutes, setMinutes] = useState(0)
  const [fadeIn, setFadeIn] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setFadeIn(true), 300)
    return () => clearTimeout(timer)
  }, [])

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? "PM" : "AM"
    const formattedHours = h % 12 || 12
    const formattedMinutes = m.toString().padStart(2, "0")
    return `${formattedHours}:${formattedMinutes} ${period}`
  }

  const time = formatTime(hours, minutes)

  return (
    <div className="flex flex-col space-y-8 w-full max-w-md mx-auto">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Hours</Label>
        <Slider
          min={0}
          max={23}
          step={1}
          value={[hours]}
          onValueChange={(value) => setHours(value[0])}
          marks={[
            { value: 0, label: "12 AM" },
            { value: 6, label: "6 AM" },
            { value: 12, label: "12 PM" },
            { value: 18, label: "6 PM" },
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Minutes</Label>
        <Slider
          min={0}
          max={59}
          step={1}
          value={[minutes]}
          onValueChange={(value) => setMinutes(value[0])}
          marks={[
            { value: 0, label: "0" },
            { value: 15, label: "15" },
            { value: 30, label: "30" },
            { value: 45, label: "45" },
          ]}
        />
      </div>

      <p className="text-lg">
        Charli with {userName} at{" "}
        <span className={cn("transition-opacity duration-300", fadeIn ? "opacity-100" : "opacity-0")}>{time}</span> on{" "}
        {date} for {sessionDuration}
      </p>

      <Button onClick={() => onConfirm(time)}>Confirm</Button>
    </div>
  )
}


