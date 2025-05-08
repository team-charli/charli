import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

export interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  marks?: { value: number; label: string }[];
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, marks, size = 'md', color = 'primary', ...props }, ref) => {
  const sizeClasses = {
    sm: {
      track: "h-1 sm:h-1.5",
      thumb: "h-3 w-3 sm:h-4 sm:w-4",
      mark: "h-1 sm:h-1.5 w-0.5",
      label: "text-[10px] sm:text-xs mt-1 sm:mt-1.5"
    },
    md: {
      track: "h-1.5 sm:h-2 md:h-2.5",
      thumb: "h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6",
      mark: "h-1.5 sm:h-2 md:h-2.5 w-0.5 sm:w-1",
      label: "text-xs sm:text-sm mt-1.5 sm:mt-2"
    },
    lg: {
      track: "h-2 sm:h-2.5 md:h-3",
      thumb: "h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7",
      mark: "h-2 sm:h-2.5 md:h-3 w-1",
      label: "text-xs sm:text-sm md:text-base mt-2 sm:mt-2.5 md:mt-3"
    }
  };
  
  const colorClasses = {
    default: {
      range: "bg-neutral-900 dark:bg-neutral-50",
      thumb: "border-neutral-900 dark:border-neutral-50"
    },
    primary: {
      range: "bg-blue-600 dark:bg-blue-500",
      thumb: "border-blue-600 dark:border-blue-500"
    },
    success: {
      range: "bg-green-600 dark:bg-green-500",
      thumb: "border-green-600 dark:border-green-500"
    },
    warning: {
      range: "bg-yellow-500 dark:bg-yellow-400",
      thumb: "border-yellow-500 dark:border-yellow-400"
    },
    danger: {
      range: "bg-red-600 dark:bg-red-500",
      thumb: "border-red-600 dark:border-red-500"
    }
  };
  
  return (
    <div className="relative w-full pt-1 pb-5 sm:pb-6 md:pb-7">
      <SliderPrimitive.Root
        ref={ref}
        className={cn("relative flex w-full touch-none select-none items-center", className)}
        {...props}
      >
        <SliderPrimitive.Track 
          className={cn(
            "relative w-full grow overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800",
            sizeClasses[size].track
          )}
        >
          <SliderPrimitive.Range 
            className={cn(
              "absolute h-full", 
              colorClasses[color].range
            )} 
          />
        </SliderPrimitive.Track>

        {marks?.map(({ value }) => (
          <div
            key={value}
            className={cn(
              "absolute bg-neutral-500 dark:bg-neutral-400",
              sizeClasses[size].mark
            )}
            style={{ left: `${(value / (props.max || 100)) * 100}%` }}
          />
        ))}

        <SliderPrimitive.Thumb 
          className={cn(
            "block rounded-full border-2 bg-white ring-offset-white transition-colors shadow-sm hover:scale-110 active:scale-105",
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
            "disabled:pointer-events-none disabled:opacity-50",
            "dark:bg-neutral-950 dark:ring-offset-neutral-950 dark:focus-visible:ring-blue-400",
            sizeClasses[size].thumb,
            colorClasses[color].thumb
          )} 
        />
      </SliderPrimitive.Root>

      {marks?.map(({ value, label }) => (
        <div
          key={value}
          className={cn(
            "absolute text-neutral-700 dark:text-neutral-300",
            sizeClasses[size].label
          )}
          style={{ left: `${(value / (props.max || 100)) * 100}%`, transform: "translateX(-50%)" }}
        >
          {label}
        </div>
      ))}
    </div>
  );
})

Slider.displayName = SliderPrimitive.Root.displayName
export { Slider }


