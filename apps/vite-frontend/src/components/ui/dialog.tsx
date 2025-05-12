import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
React.ElementRef<typeof DialogPrimitive.Overlay>,
React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
React.ElementRef<typeof DialogPrimitive.Content>,
React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[95%] sm:w-[90%] md:w-[85%] 
        max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg 
        translate-x-[-50%] translate-y-[-50%] 
        gap-3 sm:gap-4 md:gap-5 
        border border-neutral-200 
        bg-white 
        p-4 sm:p-5 md:p-6 lg:p-8 
        shadow-lg 
        rounded-lg sm:rounded-xl 
        dark:border-neutral-800 dark:bg-neutral-950",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3 sm:right-4 top-3 sm:top-4 
        rounded-full sm:rounded-md 
        w-7 h-7 sm:w-8 sm:h-8 
        flex items-center justify-center
        bg-gray-100 hover:bg-gray-200
        opacity-70 
        ring-offset-white 
        transition-opacity duration-200 
        hover:opacity-100 
        focus:outline-hidden focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 
        disabled:pointer-events-none 
        data-[state=open]:bg-neutral-100 data-[state=open]:text-neutral-500 
        dark:ring-offset-neutral-950 dark:focus:ring-neutral-300 
        dark:data-[state=open]:bg-neutral-800 dark:data-[state=open]:text-neutral-400">
        <X className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
      className={cn(
        "flex flex-col space-y-1 sm:space-y-1.5 md:space-y-2 text-center sm:text-left mb-2 sm:mb-3 md:mb-4",
        className
      )}
      {...props}
    />
  )
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2 mt-3 sm:mt-4 md:mt-5 pt-2 sm:pt-3 md:pt-4 border-t border-gray-100",
        className
      )}
      {...props}
    />
  )
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
React.ElementRef<typeof DialogPrimitive.Title>,
React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-base sm:text-lg md:text-xl lg:text-2xl font-semibold leading-tight tracking-tight text-gray-900",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
React.ElementRef<typeof DialogPrimitive.Description>,
React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-xs sm:text-sm md:text-base text-neutral-500 dark:text-neutral-400", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
