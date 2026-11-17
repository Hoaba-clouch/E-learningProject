import React, { useRef } from "react";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  spotlightRadius?: number;
}

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(238, 132, 32, 0.18)",
  spotlightRadius = 380,
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--spotlight-x", `${x}px`);
    el.style.setProperty("--spotlight-y", `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`group relative overflow-hidden transition-all duration-300 ${className}`}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Border Glow (Linear / Vercel style) */}
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
        style={{
          background: `radial-gradient(${spotlightRadius}px circle at var(--spotlight-x, 0px) var(--spotlight-y, 0px), ${spotlightColor}, transparent 80%)`,
        }}
        aria-hidden="true"
      />

      {/* Subtle Specular Border Highlight Mask */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/0 group-hover:border-amber-500/30 dark:group-hover:border-cyan-500/30 transition-colors duration-300 z-10"
        aria-hidden="true"
      />

      {/* Card Content */}
      <div className="relative z-0 h-full w-full">{children}</div>
    </div>
  );
}
