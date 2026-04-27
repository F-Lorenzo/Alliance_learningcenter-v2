"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-body transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-gold text-black font-medium hover:bg-gold-hover",
        secondary:
          "border border-border-default text-text-primary hover:border-gold hover:text-gold",
        ghost:
          "text-text-secondary hover:text-text-primary",
        danger:
          "border border-danger text-danger hover:bg-danger hover:text-white",
      },
      size: {
        sm: "text-sm px-3 py-1.5 rounded-md",
        md: "text-sm px-4 py-2.5 rounded-md",
        lg: "text-base px-6 py-3 rounded-lg",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
