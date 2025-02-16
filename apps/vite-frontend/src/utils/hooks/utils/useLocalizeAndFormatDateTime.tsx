import { useEffect, useState } from "react";

interface LocalTimeAndDate {
  localDateTime: Date;
  displayLocalTime: string;
  displayLocalDate: string;
}

export const useLocalizeAndFormatDateTime = (reqTimeDate: string | null | undefined) => {
  const [localTimeAndDate, setLocalTimeAndDate] = useState<LocalTimeAndDate>({
    localDateTime: new Date(),
    displayLocalTime: '',
    displayLocalDate: '',
  });

  // Additional state for the dateTime string for <input type="datetime-local">
  const [dateTime, setDateTime] = useState<string>("");

  useEffect(() => {
    if (reqTimeDate?.length) {
      console.log("Raw DB Timestamp Received:", reqTimeDate);

      const isoDateString = reqTimeDate.includes("Z") ? reqTimeDate : reqTimeDate.replace(" ", "T") + "Z";
      const date = new Date(isoDateString);

      // Update both the detailed object and the dateTime string
      setLocalTimeAndDate({
        localDateTime: date,
        displayLocalTime: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date),
        displayLocalDate: new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: '2-digit' }).format(date),
      });

      // Set dateTime for input
      setDateTime(date.toISOString().slice(0, 16));
    } else {
      throw new Error(`No confirmed time/date`)
    }
  }, [reqTimeDate]);

  return {
    localTimeAndDate,
    dateTime, // Use this for the DateTimeLocalInput component
    setDateTime, // Directly update the dateTime string
  };
};
