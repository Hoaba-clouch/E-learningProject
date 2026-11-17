import React, { useRef, useLayoutEffect, useEffect } from "react";
import gsap from "gsap";
import { animateMarloPill } from "../utils/marloAnimations";

export interface MarloSegmentOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  title?: string;
}

export interface MarloSegmentedControlProps<T extends string = string> {
  value: T;
  options: MarloSegmentOption<T>[];
  onChange: (val: T) => void;
  accent?: boolean;
  size?: "sm" | "md" | "lg";
  radius?: number;
  className?: string;
  label?: string;
  tone?: "dark" | "blue" | "accent";
}

/**
 * 🏷️ Ported 1:1 from Marlo (marlo-app/src/kit.jsx - function Wc / So)
 * Authentic Marlo Segmented Control with Liquid Rubberband Pill Stretch ("Kéo theo")
 * - Rounded track with inset border
 * - Active pill indicator that stretches and drags via dual-speed clipPath inset
 * - Smooth micro-pop on click
 */
export default function MarloSegmentedControl<T extends string = string>({
  value,
  options,
  onChange,
  accent = false,
  size = "md",
  radius = 9,
  className = "",
  label,
  tone = "dark",
}: MarloSegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const isFirstRender = useRef(true);

  useLayoutEffect(() => {
    const activeBtn = containerRef.current?.querySelector<HTMLElement>(
      `[aria-pressed="true"]`
    );
    animateMarloPill(thumbRef.current, activeBtn, {
      animate: !isFirstRender.current,
      radius,
    });
    isFirstRender.current = false;
  }, [value, radius]);

  useEffect(() => {
    const reposition = () => {
      const activeBtn = containerRef.current?.querySelector<HTMLElement>(
        `[aria-pressed="true"]`
      );
      animateMarloPill(thumbRef.current, activeBtn, {
        animate: false,
        radius,
      });
    };

    const ro = new ResizeObserver(reposition);
    if (containerRef.current) ro.observe(containerRef.current);
    document.fonts?.ready?.then(reposition);
    return () => ro.disconnect();
  }, [radius]);

  const triggerPop = (btn: HTMLElement) => {
    // 🏷️ Ported 1:1 from Marlo (marlo-app/src/kit.jsx - function ho)
    const target = btn.querySelector<HTMLElement>(".marlo-seg-content") ?? btn.querySelector<HTMLElement>("svg") ?? btn;
    const isWide = target === btn && btn.offsetWidth > 120;

    gsap.killTweensOf(target);
    gsap.fromTo(
      target,
      { scale: isWide ? 0.97 : 0.8 },
      {
        scale: 1,
        duration: isWide ? 0.4 : 0.55,
        ease: isWide ? "back.out(2)" : "back.out(3)",
        overwrite: true,
        clearProps: "transform",
      }
    );
  };

  return (
    <div
      ref={containerRef}
      className={`seg marlo-seg notranslate marlo-seg--${size} ${accent ? "seg--accent marlo-seg--accent" : ""} marlo-seg--tone-${tone} ${className}`}
      role="group"
      aria-label={label}
      translate="no"
    >
      <span ref={thumbRef} className="seg__thumb marlo-seg__thumb" />
      {options.map((opt) => {
        const isActive = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={isActive}
            title={opt.title}
            className="flex items-center justify-center text-center cursor-pointer select-none"
            onClick={(e) => {
              triggerPop(e.currentTarget);
              onChange(opt.id);
            }}
          >
            <span className="marlo-seg-content flex items-center justify-center gap-1.5 pointer-events-none w-full">
              {opt.icon && <span className="shrink-0 inline-flex items-center justify-center">{opt.icon}</span>}
              <span className="truncate text-center">{opt.label}</span>
              {opt.badge !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-bold leading-none shrink-0 inline-flex items-center justify-center transition-colors ${
                    isActive
                      ? tone === "dark"
                        ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                        : "bg-white text-blue-700"
                      : "bg-slate-200/90 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {opt.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
