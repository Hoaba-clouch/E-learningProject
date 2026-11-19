import React, { useRef } from "react";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  spotlightRadius?: number;
  haloColor?: string;
}

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(242, 155, 35, 0.45)",
  spotlightRadius = 380,
  haloColor = "rgba(242, 155, 35, 0.5)",
  style,
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
      style={style}
      className="relative group transition-all duration-300"
    >
      {/* 🌟 1. Radiant Ambient Halo (Hào quang phát sáng rực rỡ phía sau card khi hover) */}
      <div
        className="pointer-events-none absolute -inset-1.5 rounded-[22px] opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 group-hover:scale-[1.04] -z-10"
        style={{
          background: `radial-gradient(circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), ${haloColor}, transparent 75%)`,
        }}
        aria-hidden="true"
      />

      {/* 🌟 2. The Main Card Container with Dynamic Spotlight and Specular Border */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        className={`relative overflow-hidden transition-all duration-300 ${className}`}
        {...props}
      >
        {/* Dynamic Surface Spotlight (Tia sáng mặt card rọi theo con trỏ chuột) */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
          style={{
            background: `radial-gradient(${spotlightRadius}px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), ${spotlightColor}, transparent 80%)`,
          }}
          aria-hidden="true"
        />

        {/* Specular Neon Border Glow (Viền sáng ánh neon chuẩn Linear / Vercel) */}
        <div
          className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
          style={{
            padding: "1.5px",
            background: `radial-gradient(280px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(255, 255, 255, 0.8), ${spotlightColor} 45%, transparent 80%)`,
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
          aria-hidden="true"
        />

        {/* Card Content */}
        <div className="relative z-0 h-full w-full">{children}</div>
      </div>
    </div>
  );
}
