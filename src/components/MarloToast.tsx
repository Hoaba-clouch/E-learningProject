import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

export interface MarloToastProps {
  message: React.ReactNode;
  onUndo?: () => void;
  showUndo?: boolean;
}

export function MarloToast({
  message,
  onUndo,
  showUndo = true,
}: MarloToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed bottom-7 inset-x-0 z-[9999] flex justify-center pointer-events-none select-none px-4">
      <div className="toast-slide-up pointer-events-auto flex items-center gap-3 bg-[#F4F4F3] dark:bg-[#232326] text-[#1E1D1B] dark:text-[#E8E8E8] px-4 py-2.5 sm:px-5 sm:py-3 rounded-[18px] shadow-[0_12px_36px_rgba(0,0,0,0.22)] border border-black/[0.08] dark:border-white/10 backdrop-blur-md text-[13px] sm:text-sm font-medium select-none">
        <Check size={17} className="text-[#10b981] stroke-[2.3] shrink-0" />
        <div className="flex items-center gap-3">
          <span className="truncate max-w-[260px] sm:max-w-md">{message}</span>
          {showUndo && onUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="ml-1 px-3.5 py-1.5 rounded-[12px] bg-[#E3E2DF] hover:bg-[#D5D4CF] dark:bg-[#343438] dark:hover:bg-[#3E3E43] text-[#1E1D1B] dark:text-white font-semibold text-xs tracking-tight transition active:scale-95 cursor-pointer shrink-0"
            >
              Undo
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default MarloToast;
