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
  /** If true, preset to the current time and disallow setting a past time. */
  isToday?: boolean;
  /** If true, parent wants us to switch to minute mode. */
  forceMinute?: boolean;
  /** Notify parent whenever the user changes mode (hour/minute). */
  onModeChange?: (newMode: "hour" | "minute") => void;
}

/** Utility to pad single digits (e.g. 3 => "03"). */
function pad(value: number | string): string {
  return value.toString().padStart(2, "0");
}

/** Parse "HH:MM AM/PM" into numeric hour, minute, period. */
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

/** Format numeric hour/minute/period -> "HH:MM AM/PM". */
function formatTime(hour: number, minute: number, period: "AM" | "PM"): string {
  const hh = hour.toString().padStart(2, "0");
  const mm = minute.toString().padStart(2, "0");
  return `${hh}:${mm} ${period}`;
}

/** Convert 12hr time => total minutes [0..1440). e.g. 1:30 PM => 13*60+30=810 */
function to24HrMinutes(h: number, m: number, p: "AM" | "PM"): number {
  let hour24 = h;
  if (p === "AM" && hour24 === 12) {
    hour24 = 0;
  } else if (p === "PM" && hour24 < 12) {
    hour24 += 12;
  }
  return hour24 * 60 + m;
}

/** Return rotation angle (0..360) for hour or minute hand. */
function calcHandAngle(value: number, mode: "hour" | "minute"): number {
  return mode === "hour"
    ? ((value % 12) * 360) / 12
    : ((value % 60) * 360) / 60;
}

/**
 * If `isToday` is true, clamp to "now" if the user’s chosen time is behind the current time.
 * In minute mode, if the chosen hour == nowHour & period == nowPeriod, clamp the minute up to nowMin.
 */
function clampToNowIfPast(
  rawHour: number,
  rawMinute: number,
  rawPeriod: "AM" | "PM",
  isMinuteMode: boolean,
  isToday: boolean
): { hour: number; minute: number; period: "AM" | "PM" } {
  if (!isToday) {
    return { hour: rawHour, minute: rawMinute, period: rawPeriod };
  }
  const now = new Date();
  let nowHour = now.getHours();
  const nowMin = now.getMinutes();
  let nowPeriod: "AM" | "PM" = nowHour >= 12 ? "PM" : "AM";

  nowHour = nowHour % 12;
  if (nowHour === 0) nowHour = 12;

  // If user is adjusting minutes, and hour == nowHour & period == nowPeriod, clamp minute up to nowMin:
  if (isMinuteMode && rawHour === nowHour && rawPeriod === nowPeriod) {
    if (rawMinute < nowMin) {
      return { hour: rawHour, minute: nowMin, period: nowPeriod };
    }
  }

  // Compare total minutes
  const nowTotal = to24HrMinutes(nowHour, nowMin, nowPeriod);
  const chosenTotal = to24HrMinutes(rawHour, rawMinute, rawPeriod);
  if (chosenTotal < nowTotal) {
    return { hour: nowHour, minute: nowMin, period: nowPeriod };
  }
  return { hour: rawHour, minute: rawMinute, period: rawPeriod };
}

export const AnalogDigitalTimePicker: React.FC<AnalogDigitalTimePickerProps> = ({
  value,
  onChange,
  isToday = false,
  forceMinute = false,
  onModeChange,
}) => {
  // Parse initial value -> hour/minute/period
  const parsed = parseTimeString(value) || { hour: 12, minute: 0, period: "AM" };
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(parsed.period);

  // Which hand the user is adjusting
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  // If parent sets forceMinute => set mode to "minute"
  useEffect(() => {
    if (forceMinute) {
      setMode("minute");
      onModeChange?.("minute");
    }
  }, [forceMinute, onModeChange]);

  // The text input
  const [timeString, setTimeString] = useState(formatTime(hour, minute, period));
  // The red clock-hand angle (0..360)
  const [handAngle, setHandAngle] = useState(0);

  // For hour->minute "auto revert" after clicking an hour
  const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // For dragging
  const clockFaceRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<boolean>(false);

  // On mount, if isToday, set to the current system time
  useEffect(() => {
    if (isToday) {
      const now = new Date();
      let h = now.getHours();
      let m = now.getMinutes();
      let p: "AM" | "PM" = h >= 12 ? "PM" : "AM";
      h = h % 12;
      if (h === 0) h = 12;
      setHour(h);
      setMinute(m);
      setPeriod(p);
    }
  }, [isToday]);

  // Whenever hour/minute/period changes, update text input & call onChange
  useEffect(() => {
    const newVal = formatTime(hour, minute, period);
    setTimeString(newVal);
    onChange(newVal);
  }, [hour, minute, period, onChange]);

  /**
   * Keep the clock-hand angle in sync with the current hour/minute & mode.
   * If mode=hour, angle = hour hand. If mode=minute, angle = minute hand.
   */
  useEffect(() => {
    if (mode === "hour") {
      setHandAngle(calcHandAngle(hour, "hour"));
    } else {
      setHandAngle(calcHandAngle(minute, "minute"));
    }
  }, [mode, hour, minute]);

  // Cleanup drag listeners
  useEffect(() => {
    return () => {
      if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
      document.removeEventListener("mousemove", handleMinuteDrag);
      document.removeEventListener("mouseup", handleMinuteDragEnd);
      document.removeEventListener("mousemove", handleHourDrag);
      document.removeEventListener("mouseup", handleHourDragEnd);
    };
  }, []);

  /** User typed in the <input>. */
  function handleTimeStringChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTimeString(val);
    const parsedTime = parseTimeString(val);
    if (parsedTime) {
      const clamped = clampToNowIfPast(
        parsedTime.hour,
        parsedTime.minute,
        parsedTime.period,
        mode === "minute",
        isToday
      );
      setHour(clamped.hour);
      setMinute(clamped.minute);
      setPeriod(clamped.period);
    }
  }

  /** Toggle AM/PM. Then clamp if isToday. */
  function togglePeriod() {
    const newP = period === "AM" ? "PM" : "AM";
    const clamped = clampToNowIfPast(hour, minute, newP, mode === "minute", isToday);
    setHour(clamped.hour);
    setMinute(clamped.minute);
    setPeriod(clamped.period);
  }

  // The numeric labels on the clock
  const hourLabels = Array.from({ length: 12 }, (_, i) => ((i + 11) % 12) + 1);
  const minuteLabels = Array.from({ length: 12 }, (_, i) => i * 5);
  const numbers = mode === "hour" ? hourLabels : minuteLabels;

  // For the gray "past" arc
  const radius = 80;
  const centerX = 100;
  const centerY = 100;

  /**
   * Clicking on the clock-face text (either hour or minute).
   */
  function handleClockClick(value: number) {
    if (mode === "hour") {
      if (revertTimerRef.current) {
        clearTimeout(revertTimerRef.current);
        revertTimerRef.current = null;
      }
      const clamped = clampToNowIfPast(value, minute, period, false, isToday);
      setHour(clamped.hour);
      setMinute(clamped.minute);
      setPeriod(clamped.period);

      // After 1.5s, revert to 12:00 angle & switch to minute mode
      revertTimerRef.current = setTimeout(() => {
        setHandAngle(0);
        setMode("minute");
        revertTimerRef.current = null;
      }, 1500);
    } else {
      // minute mode
      const clamped = clampToNowIfPast(hour, value, period, true, isToday);
      setHour(clamped.hour);
      setMinute(clamped.minute);
      setPeriod(clamped.period);
    }
  }

  // ------------------ MINUTE DRAG ------------------
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

    const clamped = clampToNowIfPast(hour, newMinute, period, true, isToday);
    setHour(clamped.hour);
    setMinute(clamped.minute);
    setPeriod(clamped.period);
  }

  function handleMinuteDragEnd() {
    draggingRef.current = false;
    document.removeEventListener("mousemove", handleMinuteDrag);
    document.removeEventListener("mouseup", handleMinuteDragEnd);
  }

  // ------------------ HOUR DRAG ------------------
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

    // Snap to nearest 30° => hour increments
    const snappedAngle = Math.round(angleDeg / 30) * 30;
    let newHour = (snappedAngle / 30) % 12;
    if (newHour === 0) newHour = 12;

    const clamped = clampToNowIfPast(newHour, minute, period, false, isToday);
    setHour(clamped.hour);
    setMinute(clamped.minute);
    setPeriod(clamped.period);
  }

  function handleHourDragEnd() {
    draggingRef.current = false;
    document.removeEventListener("mousemove", handleHourDrag);
    document.removeEventListener("mouseup", handleHourDragEnd);
  }

  // ------------------ GRAY SHADING ------------------
  /**
   * If isToday, we show a gray arc representing the “past” time.
   * - If mode=hour, shade from 12:00 to the current hour angle
   * - If mode=minute & user’s hour=nowHour & period=nowPeriod, shade from 12:00 to current minute angle
   */
  let grayArc = null;
  if (isToday) {
    const now = new Date();
    let nowH = now.getHours() % 12;
    if (nowH === 0) nowH = 12;
    const nowM = now.getMinutes();
    const nowPeriod: "AM" | "PM" = now.getHours() >= 12 ? "PM" : "AM";

    let shadingAngle = 0; // 0..360

    if (mode === "hour") {
      // Shade up to the current hour
      shadingAngle = nowH * 30;
    } else {
      // minute mode: only shade if user’s hour matches the current hour & period
      // otherwise, we do no shading
      if (hour === nowH && period === nowPeriod) {
        shadingAngle = nowM * 6;
      } else {
        shadingAngle = 0; // no shading
      }
    }

    if (shadingAngle > 0) {
      const shadingRadius = radius;
      // Convert shadingAngle to radians
      const radAngle = (shadingAngle * Math.PI) / 180;
      const startX = centerX;
      const startY = centerY - shadingRadius;
      const endX = centerX + shadingRadius * Math.sin(radAngle);
      const endY = centerY - shadingRadius * Math.cos(radAngle);
      const largeArcFlag = shadingAngle > 180 ? 1 : 0;
      const arcPath = `M ${centerX} ${centerY}
L ${startX} ${startY}
A ${shadingRadius} ${shadingRadius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
      grayArc = <path d={arcPath} fill="lightgray" opacity={0.5} />;
    }
  }
  // When user explicitly clicks “Hour” or “Minute”:
  // we also notify the parent so it can track that minute mode was shown
  function handleModeClick(newMode: "hour" | "minute") {
    onModeChange?.(newMode);
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
      {/* Digital input + AM/PM toggle */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          style={{ width: "100px", textAlign: "center" }}
          type="text"
          value={timeString}
          onChange={handleTimeStringChange}
        />
        <button onClick={togglePeriod}>{period}</button>
      </div>

      {/* Hour vs. Minute mode buttons */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => handleModeClick("hour")}
          style={{ fontWeight: mode === "hour" ? "bold" : "normal" }}
        >
          Hour
        </button>
        <button
          onClick={() => handleModeClick("minute")}
          style={{ fontWeight: mode === "minute" ? "bold" : "normal" }}
        >
          Minute
        </button>
      </div>

      {/* Analog clock */}
      <div
        ref={clockFaceRef}
        style={{ position: "relative", width: "200px", height: "200px" }}
      >
        <svg
          width={200}
          height={200}
          style={{ border: "1px solid lightgray", borderRadius: "50%" }}
        >
          {/* Past shading if isToday */}
          {grayArc}
          {/* Center pivot */}
          <circle cx={100} cy={100} r={2} fill="black" />
          {/* Labels */}
          {numbers.map((val, i) => {
            const deg = (360 / 12) * i;
            const rad = (deg * Math.PI) / 180;
            const x = 100 + radius * Math.sin(rad);
            const y = 100 - radius * Math.cos(rad);
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

        {/* Red clock hand (draggable) */}
        <div
          onMouseDown={
            mode === "minute" ? handleMinuteDragStart : handleHourDragStart
          }
          style={{
            position: "absolute",
            left: `99px`, // centerX - 1
            top: `30px`,  // centerY - 70
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
