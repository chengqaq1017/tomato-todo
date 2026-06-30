import { type HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-sm border border-border bg-muted px-1.5 text-[11px] font-normal text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
