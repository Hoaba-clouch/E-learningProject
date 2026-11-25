import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type MarloToastType = "success" | "warning" | "error" | "info";

export interface MarloToastProps {
  message: React.ReactNode;
  onUndo?: () => void;
  showUndo?: boolean;
  type?: MarloToastType;
  onClose?: () => void;
}

export function MarloToast({
  message,
  onUndo,
  showUndo = true,
  type,
  onClose,
}: MarloToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  const hasWarningPrefix =
    typeof message === "string" && /^\s*⚠️\s*/.test(message);
  const resolvedType: MarloToastType =
    type ?? (hasWarningPrefix ? "warning" : "success");
  const normalizedMessage =
    typeof message === "string" ? message.replace(/^\s*⚠️\s*/, "") : message;

  const renderIcon = () => {
    switch (resolvedType) {
      case "warning":
        return <AlertCircle size={18} className="text-amber-500 dark:text-amber-400 stroke-[2.2] shrink-0" />;
      case "error":
        return <AlertTriangle size={18} className="text-rose-500 dark:text-rose-400 stroke-[2.2] shrink-0" />;
      case "info":
        return <Info size={18} className="text-blue-500 dark:text-blue-400 stroke-[2.2] shrink-0" />;
      case "success":
      default:
        return <Check size={18} className="text-[#10b981] stroke-[2.3] shrink-0" />;
    }
  };

  return createPortal(
    <div className="fixed bottom-7 inset-x-0 z-[9999] flex justify-center pointer-events-none select-none px-4">
      <div className="toast-slide-up pointer-events-auto flex items-center gap-3 bg-[#F4F4F3] dark:bg-[#232326] text-[#1E1D1B] dark:text-[#E8E8E8] px-4 py-2.5 sm:px-5 sm:py-3 rounded-[18px] shadow-[0_12px_36px_rgba(0,0,0,0.28)] border border-black/[0.08] dark:border-white/10 backdrop-blur-md text-[13px] sm:text-sm font-medium select-none max-w-[94vw] sm:max-w-2xl">
        {renderIcon()}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0 flex-1 leading-snug break-words">{normalizedMessage}</div>
          {showUndo && onUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="ml-1 px-3.5 py-1.5 rounded-[12px] bg-[#E3E2DF] hover:bg-[#D5D4CF] dark:bg-[#343438] dark:hover:bg-[#3E3E43] text-[#1E1D1B] dark:text-white font-semibold text-xs tracking-tight transition active:scale-95 cursor-pointer shrink-0"
            >
              Undo
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
              title="Đóng"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default MarloToast;
