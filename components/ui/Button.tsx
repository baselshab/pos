"use client";

import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";

const buttonVariants = cva(
  "btn",
  {
    variants: {
      variant: {
        primary: "btn--primary",
        success: "btn--success",
        teal: "btn--teal",
        navy: "btn--navy",
        danger: "btn--danger",
        outline: "btn--outline",
        "outline-danger": "btn--outline-danger",
        ghost: "btn--ghost",
        quiet: "btn--quiet",
      },
      size: {
        sm: "btn--sm",
        md: "",
        lg: "btn--lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode;
  block?: boolean;
}

export function Button({
  className,
  variant,
  size,
  icon,
  block,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        buttonVariants({ variant, size }),
        block && "btn--block",
        className
      )}
      {...props}
    >
      {icon && <span className="icon">{icon}</span>}
      {children}
    </button>
  );
}
