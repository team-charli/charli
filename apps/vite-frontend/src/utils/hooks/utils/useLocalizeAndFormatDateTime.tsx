import { useEffect, useState } from "react";

interface LocalTimeAndDate {
  localDateTime: Date;
  displayLocalTime: string;
  displayLocalDate: string;
}

export const useLocalizeAndFormatDateTime = (
  reqTimeDate: string | null | undefined
) => {
  const [localTimeAndDate, setLocalTimeAndDate] = useState<LocalTimeAndDate>({
    localDateTime: new Date(), // fallback
    displayLocalTime: "",
    displayLocalDate: "",
  });

  const [dateTime, setDateTime] = useState<string>("");

  useEffect(() => {
    if (!reqTimeDate) {
      throw new Error("No confirmed time/date");
    }
    const trimmed = reqTimeDate.trim();
    console.log("Raw DB Timestamp Received:", trimmed);

    // Check if it has a recognized offset (e.g. +00:00, -05:00) OR a 'Z'.
    // If not, we fail immediately to catch upstream insertion mistakes.
    const hasOffset = /[+\-]\d{2}:\d{2}/.test(trimmed);
    const hasZ = trimmed.toUpperCase().includes("Z");
    if (!hasOffset && !hasZ) {
      // Not a valid timestamptz string
      throw new Error(
        `Expected timestamptz (with offset or 'Z'), got: ${trimmed}`
      );
    }

    // Attempt to parse
    const date = new Date(trimmed);
    if (isNaN(date.getTime())) {
      // If it's not parseable by JS's Date
      throw new Error(`Could not parse date string: ${trimmed}`);
    }

    setLocalTimeAndDate({
      localDateTime: date,
      displayLocalTime: new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(date),
      displayLocalDate: new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
      }).format(date),
    });

    // For <input type="datetime-local">
    setDateTime(date.toISOString().slice(0, 16));
  }, [reqTimeDate]);

  return {
    localTimeAndDate,
    dateTime,
    setDateTime,
  };
};
