"use client";

import * as React from "react";
import { Input, type InputProps } from "@/components/ui/input";

/** Numeric-keypad rupee amount input. Keeps raw digits; parent parses with rupeesToPaise(). */
export const AmountInput = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return (
    <Input
      ref={ref}
      inputMode="decimal"
      autoComplete="off"
      placeholder="0"
      {...props}
      onKeyDown={(e) => {
        // allow digits, one dot, backspace/navigation/paste shortcuts
        if (
          !/[0-9.]/.test(e.key) &&
          !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key) &&
          !(e.metaKey || e.ctrlKey)
        ) {
          e.preventDefault();
        }
        props.onKeyDown?.(e);
      }}
    />
  );
});
AmountInput.displayName = "AmountInput";
