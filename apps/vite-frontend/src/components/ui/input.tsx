import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  size?: 'sm' | 'md' | 'lg';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: "h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-2.5 py-1 sm:py-1.5",
      md: "h-9 sm:h-10 md:h-11 text-sm sm:text-base px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2",
      lg: "h-11 sm:h-12 md:h-14 text-base sm:text-lg px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3",
    };
    
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-md border border-neutral-200 bg-white ring-offset-white transition-colors duration-200 shadow-sm",
          sizeClasses[size],
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-neutral-400 placeholder:text-sm sm:placeholder:text-base",
          "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:border-blue-500",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
          "dark:border-neutral-800 dark:bg-neutral-950 dark:ring-offset-neutral-950 dark:file:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus-visible:ring-neutral-300",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
