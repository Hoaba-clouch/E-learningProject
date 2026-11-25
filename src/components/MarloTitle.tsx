import React, { useMemo } from "react";

interface MarloTitleProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "span" | "div";
  delayMs?: number;
  staggerMs?: number;
}

/**
 * 🏷️ MarloTitle Component
 * Replicates the authentic kinetic typography from D:\C++\ul\marlo-app (functions oo & ao)
 * - Splits heading into words & individual characters
 * - Each word has overflow: hidden
 * - Characters rotate 6deg & slide up from 115% baseline with 0.85s expo.out easing
 * - Staggered at staggerMs per character (default 22ms)
 */
export default function MarloTitle({
  text,
  className = "",
  as: Component = "h1",
  delayMs = 0,
  staggerMs = 22,
}: MarloTitleProps) {
  const words = useMemo(() => {
    return text.trim().split(/\s+/).filter(Boolean);
  }, [text]);

  let charCounter = 0;

  return (
    <Component className={`select-none ${className}`} aria-label={text}>
      <span className="sr-only">{text}</span>
      {words.map((word, wIdx) => {
        const chars = Array.from(word);
        return (
          <React.Fragment key={`${word}-${wIdx}`}>
            <span className="marlo-word" aria-hidden="true">
              {chars.map((char, cIdx) => {
                const currentIdx = charCounter++;
                return (
                  <span
                    key={`${char}-${cIdx}`}
                    className="marlo-ch"
                    style={{
                      animationDelay: `${delayMs + currentIdx * staggerMs}ms`,
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </span>
            {wIdx < words.length - 1 && " "}
          </React.Fragment>
        );
      })}
    </Component>
  );
}
