import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TimePicker } from "./Time-Picker"

interface TimePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (time: string) => void
  userName: string
  sessionDuration: string
  date: string
}

export default function TimePickerModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  sessionDuration,
  date,
}: TimePickerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>When?</DialogTitle>
        </DialogHeader>
        <TimePicker userName={userName} sessionDuration={sessionDuration} date={date} onConfirm={onConfirm} />
      </DialogContent>
    </Dialog>
  )
}


