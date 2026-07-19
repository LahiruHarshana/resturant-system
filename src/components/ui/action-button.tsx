"use client";

import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { type VariantProps } from "class-variance-authority";

interface ActionButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  isSuccess?: boolean;
  asChild?: boolean;
}

export const ActionButton = React.forwardRef<
  HTMLButtonElement,
  ActionButtonProps
>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      isSuccess = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <Button
        ref={ref}
        variant={isSuccess ? "default" : variant}
        size={size}
        className={className}
        disabled={isLoading || disabled || isSuccess}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSuccess && !isLoading && (
          <Check className="mr-2 h-4 w-4 text-white" />
        )}
        <span className={isLoading || isSuccess ? "opacity-90" : ""}>
          {isSuccess ? "Success" : children}
        </span>
      </Button>
    );
  },
);

ActionButton.displayName = "ActionButton";
