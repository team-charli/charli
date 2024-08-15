//SentLearningRequest.tsx
import { NotificationIface } from "@/types/types";
import { Button } from '@headlessui/react'
import { useEffect } from "react";

interface NotificationComponentProps {
  notification: NotificationIface;
}

const SentLearningRequest = ({notification}: NotificationComponentProps) => {
  const okHandler = () => {

    return null
  }
  return (
    <div className="grid grid-cols-3">
      <div className="col-start-2 col-span-2">
        <ul>
          <li className="flex items-center gap-2 bg-green-300 w-1/2">
            <span className="mr-4">
              {`Sent Charli request to `}
              <span className="italic">{notification.teacherName}</span>
              {` for ${notification.teaching_lang}`}
            </span>
            <Button
              className="relative w-11 bg-white border border-gray-300 rounded-md shadow-sm py-2 flex items-center justify-center cursor-default focus:outline-none sm:text-sm flex-shrink-0"
              onClick={okHandler}
              onMouseDown={(e) => {
                e.currentTarget.classList.add('ring-1', 'ring-indigo-500', 'border-indigo-500');
              }}
              onMouseUp={(e) => {
                e.currentTarget.classList.remove('ring-1', 'ring-indigo-500', 'border-indigo-500');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.classList.remove('ring-1', 'ring-indigo-500', 'border-indigo-500');
              }}
            >
              Ok
            </Button>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default SentLearningRequest;
