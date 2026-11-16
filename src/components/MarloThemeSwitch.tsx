import React from "react";
import { Sun, Moon } from "lucide-react";
import type { Theme } from "../App";

interface Props {
  theme: Theme;
  onToggleTheme: (trigger?: HTMLElement | React.MouseEvent | any) => void;
  className?: string;
}

export default function MarloThemeSwitch({ theme, onToggleTheme, className = "" }: Props) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`themesw ${className}`}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối"}
      title={isDark ? "Chuyển sang giao diện Sáng (Light mode)" : "Chuyển sang giao diện Tối (Dark mode)"}
      onClick={(e) => onToggleTheme(e.currentTarget)}
    >
      <i className="themesw__knob" />
      <span className={isDark ? "" : "is-on"}>
        <Sun size={15} strokeWidth={2.2} />
      </span>
      <span className={isDark ? "is-on" : ""}>
        <Moon size={15} strokeWidth={2.2} />
      </span>
    </button>
  );
}
