import React, { useEffect, useState } from "react";

interface OdometerNumberProps {
  value: number | string;
  prefix?: string;
  suffix?: string;
  className?: string;
  durationMs?: number;
}

function DigitColumn({ digit, delayMs = 0 }: { digit: string; delayMs?: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 15 + delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  if (isNaN(Number(digit))) {
    return <span className="inline-block px-[0.5px] select-none">{digit}</span>;
  }

  const d = parseInt(digit, 10);
  const targetOffset = mounted ? d * 10 : 0;

  return (
    <span
      className="inline-block overflow-hidden align-baseline relative"
      style={{
        height: "1.18em",
        lineHeight: "1.18em",
        verticalAlign: "baseline",
      }}
    >
      <span
        className="flex flex-col select-none transition-transform"
        style={{
          transform: `translateY(-${targetOffset}%)`,
          transitionDuration: "350ms",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDelay: `${delayMs}ms`,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span
            key={n}
            className="flex items-center justify-center font-mono"
            style={{ height: "1.18em", lineHeight: "1.18em" }}
          >
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function OdometerNumber({
  value,
  prefix = "",
  suffix = "",
  className = "",
}: OdometerNumberProps) {
  const formatted = typeof value === "number" ? value.toLocaleString("en-US") : String(value);
  const chars = formatted.split("");

  return (
    <span className={`inline-flex items-baseline font-mono tracking-tight font-bold ${className}`}>
      {prefix && <span className="mr-[1px]">{prefix}</span>}
      {chars.map((ch, idx) => (
        <DigitColumn key={`${idx}-${chars.length}`} digit={ch} delayMs={idx * 16} />
      ))}
      {suffix && <span className="ml-[1px]">{suffix}</span>}
    </span>
  );
}
