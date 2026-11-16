import React, { useEffect, useState, useRef } from "react";

interface MarloNumberProps {
  value: number;
  durationMs?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  delayMs?: number;
}

/**
 * 🏷️ MarloNumber Component
 * Replicates Marlo's smooth tabular numerical counting and ease (expo.out / power4.out)
 * Prevents horizontal layout jumping using tabular-nums
 */
export default function MarloNumber({
  value,
  durationMs = 1200,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
  delayMs = 0,
}: MarloNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animIdRef = useRef<number>(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const startAnimation = () => {
      startTimeRef.current = null;

      const step = (now: number) => {
        if (!startTimeRef.current) startTimeRef.current = now;
        const elapsed = now - startTimeRef.current;
        const progress = Math.min(elapsed / durationMs, 1);

        // Marlo's signature expo.out ease: 1 - Math.pow(2, -10 * progress)
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = ease * value;
        const nextVal = decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current);

        setDisplayValue((prev) => (prev !== nextVal ? nextVal : prev));

        if (progress < 1) {
          animIdRef.current = requestAnimationFrame(step);
        }
      };

      animIdRef.current = requestAnimationFrame(step);
    };

    if (delayMs > 0) {
      timeoutId = setTimeout(startAnimation, delayMs);
    } else {
      startAnimation();
    }

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(animIdRef.current);
    };
  }, [value, durationMs, decimals, delayMs]);

  const formatted = decimals > 0
    ? displayValue.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : displayValue.toLocaleString("en-US");

  return (
    <span className={`marlo-num font-mono ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
