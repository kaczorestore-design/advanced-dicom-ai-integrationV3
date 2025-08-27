import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border border-medical-gray-200 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-medical-primary focus:ring-offset-2 dark:border-medical-gray-700 dark:focus:ring-medical-secondary",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-medical-primary text-white shadow hover:bg-medical-primary/80 dark:bg-medical-secondary dark:hover:bg-medical-secondary/80",
        secondary:
          "border-transparent bg-medical-gray-100 text-medical-gray-900 hover:bg-medical-gray-200 dark:bg-medical-gray-700 dark:text-white dark:hover:bg-medical-gray-600",
        destructive:
          "border-transparent bg-medical-error text-white shadow hover:bg-medical-error/80 dark:bg-medical-error dark:hover:bg-medical-error/80",
        outline: "text-medical-gray-900 dark:text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
