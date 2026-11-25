import { useEffect, useRef } from "react";

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
 * MarloNumber Component
 * Direct-DOM requestAnimationFrame counting with expo.out easing:
 * - Zero per-frame React re-renders during mount/filter updates
 * - Smoothly eases from previous rendered value to new target without resetting to 0
 */
export default function MarloNumber({
  value,
  durationMs = 750,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
  delayMs = 0,
}: MarloNumberProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const currentValRef = useRef<number>(value);
  const hasMountedRef = useRef<boolean>(false);

  const formatNum = (val: number) => {
    const rounded = decimals > 0 ? parseFloat(val.toFixed(decimals)) : Math.round(val);
    const numStr =
      decimals > 0
        ? rounded.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        : rounded.toLocaleString("en-US");
    return `${prefix}${numStr}${suffix}`;
  };

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const fromVal = hasMountedRef.current ? currentValRef.current : 0;
    hasMountedRef.current = true;
    const targetVal = Number.isFinite(value) ? value : 0;

    if (fromVal === targetVal) {
      el.textContent = formatNum(targetVal);
      currentValRef.current = targetVal;
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let animId = 0;
    let startTime: number | null = null;
    const duration = Math.max(120, durationMs);

    const run = () => {
      const step = (now: number) => {
        if (startTime === null) startTime = now;
        const progress = Math.min((now - startTime) / duration, 1);
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const nextVal = fromVal + (targetVal - fromVal) * ease;
        currentValRef.current = nextVal;
        el.textContent = formatNum(nextVal);
        if (progress < 1) {
          animId = requestAnimationFrame(step);
        } else {
          currentValRef.current = targetVal;
          el.textContent = formatNum(targetVal);
        }
      };
      animId = requestAnimationFrame(step);
    };

    if (delayMs > 0) {
      el.textContent = formatNum(fromVal);
      timeoutId = setTimeout(run, delayMs);
    } else {
      run();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      cancelAnimationFrame(animId);
    };
  }, [value, durationMs, decimals, delayMs, prefix, suffix]);

  return (
    <span ref={spanRef} className={`marlo-num font-mono ${className}`}>
      {formatNum(currentValRef.current)}
    </span>
  );
}
