import { useState, useEffect, useRef } from "react";
import { Play, Pause, Check, CheckCircle2, RotateCcw } from "lucide-react";
import "../marlo-engine/marloStyles.css";

interface Props {
  collapsed?: boolean;
  onSessionComplete?: (minutes: number) => void;
}

export default function MarloFocusTimer({ collapsed = false, onSessionComplete }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sessionTargetMinutes] = useState(25); // Pomodoro 25p chuẩn mặc định
  const [showLogToast, setShowLogToast] = useState(false);
  const [lastLoggedMins, setLastLoggedMins] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const togglePlay = () => setIsRunning((r) => !r);

  const handleStopAndLog = () => {
    if (seconds > 0) {
      const elapsedMins = Math.max(1, Math.round(seconds / 60));
      setLastLoggedMins(elapsedMins);
      setIsRunning(false);
      setSeconds(0);
      setShowLogToast(true);
      setTimeout(() => setShowLogToast(false), 3200);
      onSessionComplete?.(elapsedMins);
    } else {
      setLastLoggedMins(0);
      setIsRunning(false);
      setSeconds(0);
      setShowLogToast(true);
      setTimeout(() => setShowLogToast(false), 2200);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(0);
  };

  const formatClock = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const targetSeconds = sessionTargetMinutes * 60;
  const progressRatio = seconds > 0
    ? Math.min(1, Math.max(0.06, seconds / targetSeconds))
    : 0;

  // Chế độ thu nhỏ khi Sidebar ở dạng ray hẹp 72px
  if (collapsed) {
    return (
      <div className="marlo-scope w-[72px] flex justify-center select-none">
        <section
          className={`timer timer--rail${isRunning ? " is-on" : ""}`}
          aria-label="Time tracking"
        >
          <div className="timer__pill">
            <button
              type="button"
              className="timer__play"
              onClick={togglePlay}
              aria-label={isRunning ? "Tạm dừng bấm giờ" : "Bắt đầu tính giờ học"}
              title={isRunning ? `Đang học: ${formatClock(seconds)} (Click để tạm dừng)` : "Bắt đầu tính giờ học tập (Pomodoro Focus)"}
            >
              {isRunning ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="marlo-scope relative select-none w-full">
      {/* Toast thông báo khi lưu hoặc reset */}
      {showLogToast && (
        <div className="absolute -top-12 left-0 right-0 z-50 flex items-center justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="bg-[#161718] dark:bg-[#F0F0F1] text-white dark:text-[#161718] text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-white/10 dark:border-black/10">
            <CheckCircle2 size={13} className="text-[#F29B23]" />
            <span>
              {lastLoggedMins > 0 ? `+${lastLoggedMins} phút tập trung hoàn tất!` : "Đã đặt lại phiên tập trung!"}
            </span>
          </div>
        </div>
      )}

      {/* Widget Pomodoro Focus siêu gọn (Ultra-Compact) */}
      <section
        className={`timer${isRunning ? " is-on" : ""} !p-3 !rounded-[22px]`}
        aria-label="Pomodoro focus timer"
      >
        <div className="timer__body">
          {/* Header gọn gàng: Tiêu đề Pomodoro Focus + nút Reset/Check */}
          <div className="flex items-center justify-between mb-2 px-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-[13px] tracking-tight text-[var(--ink)] truncate">
                Pomodoro Focus
              </span>
              <span className="text-[10px] font-semibold text-[var(--muted)] shrink-0">
                (Deep Work)
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {seconds > 0 && (
                <button
                  type="button"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] transition cursor-pointer"
                  aria-label="Reset timer"
                  title="Đặt lại về 00:00:00"
                  onClick={handleReset}
                >
                  <RotateCcw size={12} strokeWidth={2.2} />
                </button>
              )}
              <button
                type="button"
                className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] transition cursor-pointer"
                aria-label="Complete session and log"
                title="Hoàn tất và lưu phiên học"
                onClick={handleStopAndLog}
              >
                <Check size={13} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>

        {/* Thanh Pill bấm giờ chính: 00:00:00 + Nút Play/Pause */}
        <div className="timer__pill !h-11">
          <i
            className={`timer__fill${isRunning ? " is-active-flowing" : ""}`}
            style={{
              transform: `scaleX(${progressRatio})`,
              opacity: progressRatio > 0 ? 1 : 0,
              transition: isRunning ? "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease" : "transform 0.2s ease, opacity 0.2s ease",
            }}
          />
          <b className="timer__clock !text-[15px]">{formatClock(seconds)}</b>
          <button
            type="button"
            className="timer__play !w-9 !h-9"
            onClick={togglePlay}
            aria-label={isRunning ? "Tạm dừng bấm giờ" : "Bắt đầu tính giờ học"}
            title={isRunning ? "Tạm dừng bấm giờ" : "Bắt đầu tính giờ học"}
          >
            {isRunning ? (
              <Pause size={15} strokeWidth={2.4} />
            ) : (
              <Play size={15} strokeWidth={2.4} className="ml-0.5" fill="currentColor" />
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
