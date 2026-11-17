import React from "react";

interface LiquidCardConnectorProps {
  className?: string;
}

/**
 * 🌊 LiquidCardConnector
 * Đường line nối thẻ học thanh thoát, gọn gàng, liền mạch:
 * - Khoảng cách khít khao giữa các thẻ (h-3 / 12px, -my-1).
 * - Sợi line dẫn dày dặn (w-[5px]) nối thẳng từ đáy thẻ trên xuống mép thẻ dưới.
 * - Hạt năng lượng hổ phách trượt chuyển động êm ái bên trong ống dẫn.
 * - Không có vòng loang/vệt vàng dư thừa gây rối mắt.
 */
export default function LiquidCardConnector({ className = "" }: LiquidCardConnectorProps) {
  return (
    <div
      className={`relative w-full h-3 flex items-center justify-between px-16 sm:px-28 md:px-44 select-none pointer-events-none -my-1 z-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* ── ĐƯỜNG DẪN 1: BÊN TRÁI ── */}
      <div className="relative flex flex-col items-center h-full justify-between">
        {/* Điểm nối mép trên */}
        <div className="w-2.5 h-[2px] rounded-b-full bg-slate-300 dark:bg-slate-700 shrink-0" />

        {/* Thân ống dẫn (w-[5px]) */}
        <div className="relative w-[5px] h-full bg-slate-300/80 dark:bg-slate-700/80 rounded-full overflow-hidden flex justify-center shadow-inner">
          <div className="absolute top-0 w-full h-2 rounded-full bg-gradient-to-b from-amber-400 to-[#EE8420] shadow-[0_0_6px_rgba(238,132,32,0.85)] animate-liquid-drop-1" />
        </div>

        {/* Điểm nối mép dưới */}
        <div className="w-2.5 h-[2px] rounded-t-full bg-slate-300 dark:bg-slate-700 shrink-0" />
      </div>

      {/* ── ĐƯỜNG DẪN 2: Ở GIỮA ── */}
      <div className="relative flex flex-col items-center h-full justify-between">
        <div className="w-2.5 h-[2px] rounded-b-full bg-slate-300 dark:bg-slate-700 shrink-0" />

        <div className="relative w-[5px] h-full bg-slate-300/80 dark:bg-slate-700/80 rounded-full overflow-hidden flex justify-center shadow-inner">
          <div className="absolute top-0 w-full h-2 rounded-full bg-gradient-to-b from-amber-400 to-[#EE8420] shadow-[0_0_6px_rgba(238,132,32,0.85)] animate-liquid-drop-2" />
        </div>

        <div className="w-2.5 h-[2px] rounded-t-full bg-slate-300 dark:bg-slate-700 shrink-0" />
      </div>

      {/* ── ĐƯỜNG DẪN 3: BÊN PHẢI ── */}
      <div className="relative flex flex-col items-center h-full justify-between">
        <div className="w-2.5 h-[2px] rounded-b-full bg-slate-300 dark:bg-slate-700 shrink-0" />

        <div className="relative w-[5px] h-full bg-slate-300/80 dark:bg-slate-700/80 rounded-full overflow-hidden flex justify-center shadow-inner">
          <div className="absolute top-0 w-full h-2 rounded-full bg-gradient-to-b from-amber-400 to-[#EE8420] shadow-[0_0_6px_rgba(238,132,32,0.85)] animate-liquid-drop-3" />
        </div>

        <div className="w-2.5 h-[2px] rounded-t-full bg-slate-300 dark:bg-slate-700 shrink-0" />
      </div>
    </div>
  );
}
