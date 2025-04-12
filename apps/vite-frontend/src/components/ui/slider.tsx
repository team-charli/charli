import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    marks?: { value: number; label: string }[]
  }
>(({ className, marks, ...props }, ref) => (
  <div className="relative w-full">
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <SliderPrimitive.Range className="absolute h-full bg-neutral-900 dark:bg-neutral-50" />
      </SliderPrimitive.Track>

      {marks?.map(({ value }) => (
        <div
          key={value}
          className="absolute h-2 w-0.5 bg-neutral-500 dark:bg-neutral-400"
          style={{ left: `${(value / (props.max || 100)) * 100}%` }}
        />
      ))}

      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-neutral-900 bg-white ring-offset-white transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-50 dark:bg-neutral-950 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300" />
    </SliderPrimitive.Root>

    {marks?.map(({ value, label }) => (
      <div
        key={value}
        className="absolute text-xs text-neutral-700 dark:text-neutral-300"
        style={{ left: `${(value / (props.max || 100)) * 100}%`, transform: "translateX(-50%)", marginTop: "0.5rem" }}
      >
        {label}
      </div>
    ))}
  </div>
))

Slider.displayName = SliderPrimitive.Root.displayName
export { Slider }


