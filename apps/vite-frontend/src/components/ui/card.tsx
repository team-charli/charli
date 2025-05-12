import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-white text-neutral-950 flex flex-col gap-4 sm:gap-5 md:gap-6 
        rounded-lg sm:rounded-xl 
        border border-neutral-200 
        py-4 sm:py-5 md:py-6 
        shadow-sm hover:shadow 
        transition-shadow duration-200
        dark:bg-neutral-950 dark:text-neutral-50 dark:border-neutral-800",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 sm:gap-1.5 md:gap-2 
        px-4 sm:px-5 md:px-6 
        has-data-[slot=card-action]:grid-cols-[1fr_auto] 
        [.border-b]:pb-4 sm:[.border-b]:pb-5 md:[.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-tight font-semibold text-base sm:text-lg md:text-xl lg:text-2xl", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-neutral-500 text-xs sm:text-sm md:text-base dark:text-neutral-400", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 sm:px-5 md:px-6 text-sm sm:text-base", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center justify-between flex-wrap gap-2 sm:gap-3 
                   px-4 sm:px-5 md:px-6 
                   [.border-t]:pt-4 sm:[.border-t]:pt-5 md:[.border-t]:pt-6 
                   text-sm sm:text-base", 
      className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
