import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-medical-gray-300 bg-white px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-medical-gray-900 placeholder:text-medical-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-primary focus-visible:border-medical-primary disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-medical-gray-600 dark:bg-medical-gray-800 dark:text-white dark:placeholder:text-medical-gray-400 dark:focus-visible:ring-medical-secondary",
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
