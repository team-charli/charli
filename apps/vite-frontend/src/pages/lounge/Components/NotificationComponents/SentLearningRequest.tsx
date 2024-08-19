//SentLearningRequest.tsx
import { NotificationIface } from "@/types/types";
import { Button } from '@headlessui/react'
import { useEffect } from "react";

interface NotificationComponentProps {
  notification: NotificationIface;
}

const SentLearningRequest = ({notification}: NotificationComponentProps) => {

  return (
    <div className="grid grid-cols-3">
      <div className="col-start-2 col-span-2">
        <ul>
          <li className="flex items-center gap-2 bg-green-300 w-1/2 border-2 border-neutral-700">
            <span className="mr-4">
              {`Sent Charli request to `}
              <span className="italic">{notification.teacherName}</span>
              {` for ${notification.teaching_lang}`}
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default SentLearningRequest;
