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
        <Button 
          variant="outline" 
          className="w-full sm:w-auto text-sm sm:text-base py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5"
        >
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Select Day
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[280px] sm:w-[320px] md:w-[360px] rounded-2xl sm:rounded-3xl border-0 bg-[#F5F5F5] p-4 sm:p-5 md:p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl sm:text-2xl md:text-3xl font-medium">When?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 pt-4 sm:pt-5 md:pt-6">
          {/* Quick select buttons */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <Button
              variant="ghost"
              className={cn(
                "h-10 sm:h-11 md:h-12 rounded-full bg-[#6B5B95] text-base sm:text-lg md:text-xl font-normal text-white hover:bg-[#5d4f82] transition-colors",
                selectedDay === "Today" && "bg-[#5d4f82]",
              )}
              onClick={() => setSelectedDay("Today")}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "h-10 sm:h-11 md:h-12 rounded-full bg-[#6B5B95] text-base sm:text-lg md:text-xl font-normal text-white hover:bg-[#5d4f82] transition-colors",
                selectedDay === "Tomorrow" && "bg-[#5d4f82]",
              )}
              onClick={() => setSelectedDay("Tomorrow")}
            >
              Tomorrow
            </Button>
          </div>

          <Separator className="my-2 sm:my-3 bg-gray-300" />

          {/* Weekday buttons */}
          <div className="flex flex-col gap-2 sm:gap-2.5 md:gap-3">
            {weekdays.map((day) => (
              <Button
                key={day}
                variant="ghost"
                className={cn(
                  "h-9 sm:h-10 md:h-11 rounded-full bg-[#6B5B95] text-sm sm:text-base md:text-lg font-normal text-white hover:bg-[#5d4f82] transition-colors shadow-sm",
                  selectedDay === day && "bg-[#5d4f82]",
                )}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </Button>
            ))}
          </div>
          
          <div className="mt-3 sm:mt-4 md:mt-5 flex justify-end">
            <Button 
              variant="primary"
              className="rounded-full w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-sm sm:text-base md:text-lg text-white px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3"
              disabled={!selectedDay}
            >
              Confirm Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


