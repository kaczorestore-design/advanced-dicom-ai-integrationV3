import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 dark:focus-visible:ring-medical-secondary",
  {
    variants: {
      variant: {
        default:
          "bg-medical-primary text-white shadow hover:bg-medical-primary/90 focus-visible:ring-medical-primary dark:bg-medical-secondary dark:hover:bg-medical-secondary/90",
        destructive:
          "bg-medical-error text-white shadow-sm hover:bg-medical-error/90 dark:bg-medical-error dark:hover:bg-medical-error/90",
        outline:
          "border border-medical-gray-300 bg-white text-black shadow-sm hover:bg-medical-gray-50 hover:text-medical-gray-900 dark:border-medical-gray-600 dark:bg-medical-gray-800 dark:hover:bg-medical-gray-700 dark:hover:text-white",
        secondary:
          "bg-medical-gray-100 text-medical-gray-900 shadow-sm hover:bg-medical-gray-200 dark:bg-medical-gray-700 dark:text-white dark:hover:bg-medical-gray-600",
        ghost: "hover:bg-medical-gray-100 hover:text-medical-gray-900 dark:hover:bg-medical-gray-700 dark:hover:text-white",
        link: "text-medical-primary underline-offset-4 hover:underline dark:text-medical-secondary",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
