// Time-Picker.tsx
import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  MouseEvent as ReactMouseEvent,
} from "react";

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
  /**
   * If true, the component will preset to the current time
   * and disallow setting any time in the past (clamp if needed).
   */
  isToday?: boolean;
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

  // Bound check
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
 * Convert a (12-hour-based) hour, minute, period => total minutes since midnight in 24-hour space.
 * e.g. (1, 30, 'PM') => 13*60 + 30 => 810.
 */
function to24HrMinutes(h: number, m: number, p: "AM" | "PM"): number {
  let hour24 = h;
  if (p === "AM" && hour24 === 12) {
    hour24 = 0; // 12:xx AM is 00:xx
  } else if (p === "PM" && hour24 < 12) {
    hour24 += 12;
  }
  return hour24 * 60 + m;
}

/**
 * Compute the rotation angle (in degrees) for the clock hand.
 * - For hours: each hour is 30°
 * - For minutes: each minute is 6°
 */
function calcHandAngle(value: number, mode: "hour" | "minute"): number {
  if (mode === "hour") {
    return (value % 12) * 30;
  }
  return (value % 60) * 6;
}

export const AnalogDigitalTimePicker: React.FC<AnalogDigitalTimePickerProps> = ({
  value,
  onChange,
  isToday = false,
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

  // Timer ref for reverting hour hand after a click:
  const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // For dragging the clock hand:
  const clockFaceRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<boolean>(false);

  /**
   * If isToday is true and the user attempts to set a time in the past,
   * we clamp them to the current system time (and period).
   */
  function clampToNowIfPast(
    rawHour: number,
    rawMinute: number
  ): { hour: number; minute: number; period: "AM" | "PM" } {
    if (!isToday) {
      // Not "today"? No clamping
      return { hour: rawHour, minute: rawMinute, period };
    }

    const now = new Date();
    let nowHour = now.getHours();
    let nowMin = now.getMinutes();
    let nowPeriod: "AM" | "PM" = nowHour >= 12 ? "PM" : "AM";

    // Convert now to 12-hour form
    nowHour = nowHour % 12;
    if (nowHour === 0) nowHour = 12;

    const nowTotal = to24HrMinutes(nowHour, nowMin, nowPeriod);
    const chosenTotal = to24HrMinutes(rawHour, rawMinute, period);

    if (chosenTotal < nowTotal) {
      // Clamp to the current time, including the period
      return {
        hour: nowHour,
        minute: nowMin,
        period: nowPeriod,
      };
    }
    // Otherwise, user’s chosen time is fine
    return { hour: rawHour, minute: rawMinute, period };
  }

  // On mount, if today is selected, preset to the current time:
  useEffect(() => {
    if (isToday) {
      const now = new Date();
      let currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentPeriod = currentHour >= 12 ? "PM" : "AM";
      currentHour = currentHour % 12;
      if (currentHour === 0) currentHour = 12;
      setHour(currentHour);
      setMinute(currentMinute);
      setPeriod(currentPeriod);
      setHandAngle(calcHandAngle(currentHour, "hour"));
    }
  }, [isToday]);

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
      document.removeEventListener("mousemove", handleMinuteDrag);
      document.removeEventListener("mouseup", handleMinuteDragEnd);
      document.removeEventListener("mousemove", handleHourDrag);
      document.removeEventListener("mouseup", handleHourDragEnd);
    };
  }, []);

  /** Handle user typing into the <input>. */
  function handleTimeStringChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTimeString(val);

    const parsedTime = parseTimeString(val);
    if (parsedTime) {
      // Possibly clamp
      const clamped = clampToNowIfPast(parsedTime.hour, parsedTime.minute);
      setHour(clamped.hour);
      setMinute(clamped.minute);
      setPeriod(clamped.period);
    }
  }

  /** Toggle AM ↔ PM. */
  function togglePeriod() {
    // If user toggles period, we should clamp as well
    const newP = period === "AM" ? "PM" : "AM";
    setPeriod(newP);

    // Possibly clamp the new time
    const clamped = clampToNowIfPast(hour, minute);
    setHour(clamped.hour);
    setMinute(clamped.minute);
    setPeriod(clamped.period);
  }

  // Hour or minute labels:
  const hourLabels = Array.from({ length: 12 }, (_, i) => ((i + 11) % 12) + 1);
  const minuteLabels = Array.from({ length: 12 }, (_, i) => i * 5);
  const numbers = mode === "hour" ? hourLabels : minuteLabels;

  // Dimensions for the clock face:
  const radius = 80;
  const centerX = 100;
  const centerY = 100;

  // Clicking on clock-face labels:
  function handleClockClick(value: number) {
    if (mode === "hour") {
      if (revertTimerRef.current) {
        clearTimeout(revertTimerRef.current);
        revertTimerRef.current = null;
      }
      // Attempt to set hour => clamp
      const clamped = clampToNowIfPast(value, minute);
      setHour(clamped.hour);
      setMinute(clamped.minute);
      setPeriod(clamped.period);

      // Update angle based on final clamped hour
      const angle = calcHandAngle(clamped.hour, "hour");
      setHandAngle(angle);

      // After 1.5s, revert hand to 12:00 and switch to minutes
      revertTimerRef.current = setTimeout(() => {
        setHandAngle(0);
        setMode("minute");
        revertTimerRef.current = null;
      }, 1500);
    } else {
      // minute mode
      const clamped = clampToNowIfPast(hour, value);
      setHour(clamped.hour);
      setMinute(clamped.minute);
      setPeriod(clamped.period);

      // Update angle based on final clamped minute
      const angle = calcHandAngle(clamped.minute, "minute");
      setHandAngle(angle);
    }
  }

  // --- DRAGGING THE MINUTE HAND ---
  function handleMinuteDragStart(e: ReactMouseEvent<HTMLDivElement>) {
    if (mode !== "minute") return;
    draggingRef.current = true;
    e.preventDefault();
    document.addEventListener("mousemove", handleMinuteDrag);
    document.addEventListener("mouseup", handleMinuteDragEnd);
  }

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

    // Now clamp
    const clamped = clampToNowIfPast(hour, newMinute);
    setHour(clamped.hour);
    setMinute(clamped.minute);
    setPeriod(clamped.period);

    // Recalculate the angle from the final clamped minute:
    const finalAngle = calcHandAngle(clamped.minute, "minute");
    setHandAngle(finalAngle);
  }

  function handleMinuteDragEnd() {
    draggingRef.current = false;
    document.removeEventListener("mousemove", handleMinuteDrag);
    document.removeEventListener("mouseup", handleMinuteDragEnd);
  }

  // --- DRAGGING THE HOUR HAND ---
  function handleHourDragStart(e: ReactMouseEvent<HTMLDivElement>) {
    if (mode !== "hour") return;
    draggingRef.current = true;
    e.preventDefault();
    document.addEventListener("mousemove", handleHourDrag);
    document.addEventListener("mouseup", handleHourDragEnd);
  }

  function handleHourDrag(e: MouseEvent) {
    if (!draggingRef.current || !clockFaceRef.current) return;
    const rect = clockFaceRef.current.getBoundingClientRect();
    const cx = rect.left + centerX;
    const cy = rect.top + centerY;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angleDeg < 0) angleDeg += 360;

    // Snap to the nearest 30° => hour increments
    const snappedAngle = Math.round(angleDeg / 30) * 30;
    let newHour = (snappedAngle / 30) % 12;
    if (newHour === 0) newHour = 12;

    // Clamp
    const clamped = clampToNowIfPast(newHour, minute);
    setHour(clamped.hour);
    setMinute(clamped.minute);
    setPeriod(clamped.period);

    // Recalc final angle from final clamped hour
    const finalAngle = calcHandAngle(clamped.hour, "hour");
    setHandAngle(finalAngle);
  }

  function handleHourDragEnd() {
    draggingRef.current = false;
    document.removeEventListener("mousemove", handleHourDrag);
    document.removeEventListener("mouseup", handleHourDragEnd);
  }

  // Compute a gray arc for “past” shading when today is selected.
  // (Unchanged from your version. We leave it as-is.)
  let grayArc = null;
  if (isToday) {
    const now = new Date();
    let nowHour = now.getHours();
    nowHour = nowHour % 12;
    if (nowHour === 0) nowHour = 12;
    const currentHourAngle = calcHandAngle(nowHour, "hour");
    if (currentHourAngle > 0) {
      const shadingRadius = radius;
      const startX = centerX;
      const startY = centerY - shadingRadius;
      const endAngleRad = (currentHourAngle * Math.PI) / 180;
      const endX = centerX + shadingRadius * Math.sin(endAngleRad);
      const endY = centerY - shadingRadius * Math.cos(endAngleRad);
      const largeArcFlag = currentHourAngle > 180 ? 1 : 0;
      const arcPath = `M ${centerX} ${centerY}
        L ${startX} ${startY}
        A ${shadingRadius} ${shadingRadius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
      grayArc = <path d={arcPath} fill="lightgray" opacity={0.5} />;
    }
  }

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
          {/* Render gray shading if today is selected */}
          {grayArc}
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

        {/* Clock hand (draggable for both modes) */}
        <div
          onMouseDown={
            mode === "minute" ? handleMinuteDragStart : handleHourDragStart
          }
          style={{
            position: "absolute",
            left: `${centerX - 1}px`,
            top: `${centerY - 70}px`,
            width: "2px",
            height: "70px",
            backgroundColor: "red",
            transformOrigin: "50% 100%",
            transform: `rotate(${handAngle}deg)`,
            transition: draggingRef.current ? "none" : "transform 0.2s ease-out",
            cursor: mode === "minute" ? "pointer" : "grab",
          }}
        />
      </div>
    </div>
  );
};
