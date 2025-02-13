//Time-Picker.tsx
import React, { useState, useEffect, useRef, ChangeEvent } from "react";

interface ParsedTime {
  hour: number;
  minute: number;
  period: "AM" | "PM";
}

interface AnalogDigitalTimePickerProps {
  /** A time string in the format "HH:MM AM" or "HH:MM PM" */
  value: string;
  /** Called whenever the user changes the time. Returns the same format as `value`. */
  onChange: (newTime: string) => void;
}

/** Utility to pad single digits (e.g. 3 => "03"). */
function pad(value: number | string): string {
  return value.toString().padStart(2, "0");
}

/** Parse a time string "HH:MM" or "HH:MM AM/PM". */
function parseTimeString(str: string): ParsedTime | null {
  const timeRegex = /^(\d{1,2}):(\d{1,2})(?:\s?(AM|PM))?$/i;
  const match = str.trim().match(timeRegex);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  let minute = parseInt(match[2], 10);
  let period = (match[3] || "").toUpperCase() || "AM";

  if (hour < 1) hour = 1;
  if (hour > 12) hour = 12;
  if (minute < 0) minute = 0;
  if (minute > 59) minute = 59;

  return { hour, minute, period: period as "AM" | "PM" };
}

/** Format time as "HH:MM AM/PM". */
function formatTime(hour: number, minute: number, period: "AM" | "PM"): string {
  return `${pad(hour)}:${pad(minute)} ${period}`;
}

/**
 * Compute the rotation angle (in degrees) for the clock hand.
 * - For hours: each hour is 30°
 * - For minutes: each minute is 6°
 */
function calcHandAngle(value: number, mode: "hour" | "minute"): number {
  if (mode === "hour") {
    return (value % 12) * 30;
  } else {
    return (value % 60) * 6;
  }
}

export const AnalogDigitalTimePicker: React.FC<AnalogDigitalTimePickerProps> = ({
  value,
  onChange
}) => {
  // Parse the initial time string to internal hour/minute/period state:
  const parsed = parseTimeString(value) || { hour: 12, minute: 0, period: "AM" };
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(parsed.period);

  // "hour" or "minute" mode:
  const [mode, setMode] = useState<"hour" | "minute">("hour");

  // The text input’s value:
  const [timeString, setTimeString] = useState(formatTime(hour, minute, period));

  // Current clock hand angle in degrees:
  const [handAngle, setHandAngle] = useState<number>(0);

  // Timer ref for reverting hour hand:
  const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // For dragging the minute hand:
  const clockFaceRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<boolean>(false);

  // Whenever hour/minute/period changes, update text input and fire onChange upward:
  useEffect(() => {
    const newFormatted = formatTime(hour, minute, period);
    setTimeString(newFormatted);
    onChange(newFormatted);
  }, [hour, minute, period, onChange]);

  // Cleanup timers/listeners on unmount:
  useEffect(() => {
    return () => {
      if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
      // remove event listeners if user unmounts mid-drag
      document.removeEventListener("mousemove", handleMinuteDrag);
      document.removeEventListener("mouseup", handleMinuteDragEnd);
    };
  }, []);

  /** Handle user typing into the <input>. */
  function handleTimeStringChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTimeString(val);
    const parsedTime = parseTimeString(val);
    if (parsedTime) {
      setHour(parsedTime.hour);
      setMinute(parsedTime.minute);
      setPeriod(parsedTime.period);
    }
  }

  /** Toggle AM ↔ PM. */
  function togglePeriod() {
    setPeriod((prev) => (prev === "AM" ? "PM" : "AM"));
  }

  // Hour or minute labels:
  const hourLabels = Array.from({ length: 12 }, (_, i) => ((i + 11) % 12) + 1);
  const minuteLabels = Array.from({ length: 12 }, (_, i) => i * 5);
  const numbers = mode === "hour" ? hourLabels : minuteLabels;

  // Dimensions for the clock face:
  const radius = 80;
  const centerX = 100;
  const centerY = 100;

  /** Clicking on clock-face labels. */
  function handleClockClick(value: number) {
    if (mode === "hour") {
      if (revertTimerRef.current) {
        clearTimeout(revertTimerRef.current);
        revertTimerRef.current = null;
      }
      setHour(value);
      const angle = calcHandAngle(value, "hour");
      setHandAngle(angle);

      // After 1.5s, revert hand to 12:00 and switch to minutes
      revertTimerRef.current = setTimeout(() => {
        setHandAngle(0);
        setMode("minute");
        revertTimerRef.current = null;
      }, 1500);
    } else {
      // minute mode
      setMinute(value);
      const angle = calcHandAngle(value, "minute");
      setHandAngle(angle);
    }
  }

  // --- DRAGGING THE MINUTE HAND ---

  /** React’s synthetic event on <div onMouseDown> */
  function handleMinuteDragStart(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== "minute") return;
    draggingRef.current = true;
    e.preventDefault();
    // For the real DOM's mousemove/mouseup:
    document.addEventListener("mousemove", handleMinuteDrag);
    document.addEventListener("mouseup", handleMinuteDragEnd);
  }

  /** Native mousemove event, from addEventListener. */
  function handleMinuteDrag(e: MouseEvent) {
    if (!draggingRef.current || !clockFaceRef.current) return;

    const rect = clockFaceRef.current.getBoundingClientRect();
    const cx = rect.left + centerX;
    const cy = rect.top + centerY;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angleDeg < 0) angleDeg += 360;

    const newMinute = Math.round(angleDeg / 6) % 60;
    setMinute(newMinute);
    setHandAngle(newMinute * 6);
  }

  /** Native mouseup event, from addEventListener. */
  function handleMinuteDragEnd() {
    draggingRef.current = false;
    document.removeEventListener("mousemove", handleMinuteDrag);
    document.removeEventListener("mouseup", handleMinuteDragEnd);
  }

  // Clock-hand geometry:
  const handWidth = 2;
  const handHeight = 70;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        alignItems: "center",
      }}
    >
      {/* Digital input + AM/PM button */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          style={{ width: "100px", textAlign: "center" }}
          type="text"
          value={timeString}
          onChange={handleTimeStringChange}
        />
        <button onClick={togglePeriod}>{period}</button>
      </div>

      {/* Mode Toggle (Hour vs. Minute) */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => setMode("hour")}
          style={{ fontWeight: mode === "hour" ? "bold" : "normal" }}
        >
          Hour
        </button>
        <button
          onClick={() => setMode("minute")}
          style={{ fontWeight: mode === "minute" ? "bold" : "normal" }}
        >
          Minute
        </button>
      </div>

      {/* Analog Clock Face */}
      <div
        ref={clockFaceRef}
        style={{ position: "relative", width: "200px", height: "200px" }}
      >
        <svg
          width={200}
          height={200}
          style={{ border: "1px solid lightgray", borderRadius: "50%" }}
        >
          {/* Center pivot dot */}
          <circle cx={centerX} cy={centerY} r={2} fill="black" />
          {/* Hour or Minute labels */}
          {numbers.map((val, i) => {
            const deg = (360 / 12) * i;
            const rad = (deg * Math.PI) / 180;
            const x = centerX + radius * Math.sin(rad);
            const y = centerY - radius * Math.cos(rad);
            return (
              <text
                key={val}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14}
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => handleClockClick(val)}
              >
                {mode === "hour" ? val : pad(val)}
              </text>
            );
          })}
        </svg>

        {/* Red clock hand (drag to set minute) */}
        <div
          onMouseDown={handleMinuteDragStart}
          style={{
            position: "absolute",
            left: `${centerX - handWidth / 2}px`,
            top: `${centerY - handHeight}px`,
            width: `${handWidth}px`,
            height: `${handHeight}px`,
            backgroundColor: "red",
            transformOrigin: "calc(50% + 2px) calc(100% + 2px)",
            transform: `rotate(${handAngle}deg)`,
            transition: draggingRef.current ? "none" : "transform 0.2s ease-out",
            cursor: mode === "minute" ? "pointer" : "default",
          }}
        />
      </div>
    </div>
  );
};
