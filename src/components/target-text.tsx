"use client";

import { cn } from "@/lib/utils";

interface TargetTextProps {
  children: React.ReactNode;
  className?: string;
  direction?: "rtl" | "ltr";
  as?: "span" | "p" | "div";
}

export function TargetText({
  children,
  className,
  direction = "rtl",
  as: Tag = "span",
}: TargetTextProps) {
  return (
    <Tag
      dir={direction}
      style={{ lineHeight: 1.8 }}
      className={cn(
        "font-target text-[1.15em] font-semibold",
        direction === "rtl" && "text-right",
        className
      )}
    >
      {children}
    </Tag>
  );
}
