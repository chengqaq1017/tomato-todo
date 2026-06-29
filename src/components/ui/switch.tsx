import { type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

interface SwitchProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
}

export function Switch({ checked, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative h-6 w-11 rounded-full border transition",
        checked ? "bg-primary" : "bg-muted",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
          checked ? "left-5" : "left-0.5",
        )}
      />
    </button>
  );
}
