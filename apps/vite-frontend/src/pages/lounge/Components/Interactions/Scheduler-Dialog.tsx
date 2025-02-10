import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

function getUpcomingWeekdays() {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const today = new Date()
  const dayIndex = today.getDay()

  // Get the next 5 days after tomorrow
  const weekdays = []
  let currentIndex = (dayIndex + 2) % 7 // Start from day after tomorrow

  for (let i = 0; i < 5; i++) {
    weekdays.push(days[currentIndex])
    currentIndex = (currentIndex + 1) % 7
  }

  return weekdays
}

export function SchedulerDialog() {
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null)
  const weekdays = getUpcomingWeekdays()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Select Day</Button>
      </DialogTrigger>
      <DialogContent className="w-[280px] rounded-3xl border-0 bg-[#F5F5F5] p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-medium">When?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-6">
          {/* Quick select buttons */}
          <div className="flex flex-col gap-3">
            <Button
              variant="ghost"
              className={cn(
                "h-12 rounded-full bg-[#6B5B95] text-lg font-normal text-white hover:bg-[#5d4f82]",
                selectedDay === "Today" && "bg-[#5d4f82]",
              )}
              onClick={() => setSelectedDay("Today")}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "h-12 rounded-full bg-[#6B5B95] text-lg font-normal text-white hover:bg-[#5d4f82]",
                selectedDay === "Tomorrow" && "bg-[#5d4f82]",
              )}
              onClick={() => setSelectedDay("Tomorrow")}
            >
              Tomorrow
            </Button>
          </div>

          <Separator className="my-2 bg-gray-300" />

          {/* Weekday buttons */}
          <div className="flex flex-col gap-2">
            {weekdays.map((day) => (
              <Button
                key={day}
                variant="ghost"
                className={cn(
                  "h-10 rounded-full bg-[#6B5B95] text-base font-normal text-white hover:bg-[#5d4f82]",
                  selectedDay === day && "bg-[#5d4f82]",
                )}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


