"use client";

import * as React from "react";
import { Input } from "./input";
import { sanitizeDecimalInput } from "@/lib/numbers";

type NumberInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onChange" | "inputMode"
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

/**
 * Campo numérico em pt-BR: aceita só dígitos e vírgula decimal.
 * Funciona controlado (value + onValueChange) ou não controlado (defaultValue).
 * O valor vindo do banco com ponto ("20.5") é exibido com vírgula ("20,5").
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, defaultValue, onValueChange, ...props }, ref) => {
    const [inner, setInner] = React.useState(defaultValue ?? "");
    const current = (value ?? inner).replace(".", ",");

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={current}
        onChange={(e) => {
          const next = sanitizeDecimalInput(e.target.value);
          if (value === undefined) setInner(next);
          onValueChange?.(next);
        }}
        {...props}
      />
    );
  }
);
NumberInput.displayName = "NumberInput";
