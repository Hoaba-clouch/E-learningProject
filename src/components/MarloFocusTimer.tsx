import { useState, useEffect, useRef, type FormEvent } from "react";
import { Play, Pause, Check, CheckCircle2, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import "../marlo-engine/marloStyles.css";

interface Props {
  collapsed?: boolean;
  onSessionComplete?: (minutes: number) => void;
}

const FOCUS_PRESETS = [15, 25, 45, 60] as const;
const FOCUS_DURATION_STORAGE_KEY = "codemind_focus_target_mins";
const MIN_FOCUS_MINUTES = 1;
const MAX_FOCUS_MINUTES = 180;

function clampDurationMinutes(mins: number): number {
  return Math.max(MIN_FOCUS_MINUTES, Math.min(MAX_FOCUS_MINUTES, Math.round(mins)));
}

function readStoredTargetMinutes(): number {
  try {
    const raw = window.localStorage.getItem(FOCUS_DURATION_STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed) && parsed >= MIN_FOCUS_MINUTES && parsed <= MAX_FOCUS_MINUTES) {
      return parsed;
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return 25;
}

export default function MarloFocusTimer({ collapsed = false, onSessionComplete }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [sessionTargetMinutes, setSessionTargetMinutes] = useState<number>(readStoredTargetMinutes);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>(() =>
    String(readStoredTargetMinutes())
  );
  const [showLogToast, setShowLogToast] = useState(false);
  const [toastText, setToastText] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onSessionComplete);
  onCompleteRef.current = onSessionComplete;

  const triggerToast = (message: string, durationMs = 3200) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastText(message);
    setShowLogToast(true);
    toastTimeoutRef.current = setTimeout(() => {
      setShowLogToast(false);
      toastTimeoutRef.current = null;
    }, durationMs);
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(FOCUS_DURATION_STORAGE_KEY, String(sessionTargetMinutes));
    } catch {
      // Ignore storage quota or access errors
    }
  }, [sessionTargetMinutes]);

  useEffect(() => {
    const handleRemoteStart = (e: Event) => {
      const detail = (e as CustomEvent<{ minutes?: number }>).detail;
      const mins = clampDurationMinutes(Number(detail?.minutes) || 25);
      setSessionTargetMinutes(mins);
      setElapsedSeconds(0);
      setIsRunning(true);
      triggerToast(`✓ Đã bật Pomodoro tập trung (${mins} phút)`);
    };
    window.addEventListener("codemind-pomodoro-start", handleRemoteStart);
    return () => {
      window.removeEventListener("codemind-pomodoro-start", handleRemoteStart);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning]);

  const targetSeconds = sessionTargetMinutes * 60;
  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
  const progressRatio =
    elapsedSeconds > 0 ? Math.min(1, Math.max(0.05, elapsedSeconds / targetSeconds)) : 0;

  useEffect(() => {
    if (isRunning && elapsedSeconds >= targetSeconds) {
      setIsRunning(false);
      setElapsedSeconds(0);
      triggerToast(`Hoàn tất ${sessionTargetMinutes} phút tập trung!`, 3600);
      onCompleteRef.current?.(sessionTargetMinutes);
    }
  }, [isRunning, elapsedSeconds, targetSeconds, sessionTargetMinutes]);

  const togglePlay = () => setIsRunning((r) => !r);

  const handleSelectDuration = (mins: number) => {
    const clamped = clampDurationMinutes(mins);
    setIsRunning(false);
    setElapsedSeconds(0);
    setSessionTargetMinutes(clamped);
    setCustomMinutesInput(String(clamped));
    setIsEditingCustom(false);
  };

  const handleApplyCustom = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = Number.parseInt(customMinutesInput.trim(), 10);
    if (!Number.isFinite(parsed)) {
      setCustomMinutesInput(String(sessionTargetMinutes));
      setIsEditingCustom(false);
      return;
    }
    handleSelectDuration(parsed);
  };

  const handleStopAndLog = () => {
    if (elapsedSeconds > 0) {
      const elapsedMins = Math.max(1, Math.round(elapsedSeconds / 60));
      setIsRunning(false);
      setElapsedSeconds(0);
      triggerToast(`+${elapsedMins} phút tập trung hoàn tất!`, 3200);
      onCompleteRef.current?.(elapsedMins);
    } else {
      setIsRunning(false);
      setElapsedSeconds(0);
      triggerToast("Đã đặt lại phiên tập trung!", 2200);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
  };

  const formatClock = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isPresetActive = (FOCUS_PRESETS as readonly number[]).includes(sessionTargetMinutes);

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
              title={
                isRunning
                  ? `Còn lại: ${formatClock(remainingSeconds)} / ${sessionTargetMinutes}p (Click để tạm dừng)`
                  : `Bắt đầu phiên tập trung ${sessionTargetMinutes} phút`
              }
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
      {/* Toast thông báo khi hoàn tất hoặc đặt lại */}
      {showLogToast && (
        <div className="absolute -top-12 left-0 right-0 z-50 flex items-center justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="bg-[#161718] dark:bg-[#F0F0F1] text-white dark:text-[#161718] text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-white/10 dark:border-black/10 whitespace-nowrap">
            <CheckCircle2 size={13} className="text-[#F29B23]" />
            <span>{toastText}</span>
          </div>
        </div>
      )}

      {/* Widget Pomodoro Focus siêu gọn (Ultra-Compact) */}
      <section
        className={`timer${isRunning ? " is-on" : ""} !p-3 !rounded-[22px]`}
        aria-label="Pomodoro focus timer"
      >
        <div className="timer__body">
          {/* Header gọn gàng: Tiêu đề Pomodoro Focus + nhãn thời lượng + nút Reset/Check */}
          <div className="flex items-center justify-between mb-2 px-0.5 gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-[13px] tracking-tight text-[var(--ink)] truncate">
                Pomodoro Focus
              </span>
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-[var(--card-2)] text-[var(--ink-2)] border border-[var(--line)] shrink-0 leading-none">
                {sessionTargetMinutes}p
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {elapsedSeconds > 0 && (
                <button
                  type="button"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] transition cursor-pointer"
                  aria-label="Reset timer"
                  title={`Đặt lại về ${formatClock(targetSeconds)}`}
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

          {/* Hàng chọn thời lượng tập trung: preset 15p/25p/45p/60p hoặc nhập tùy chỉnh */}
          {isEditingCustom ? (
            <form onSubmit={handleApplyCustom} className="flex items-center gap-1 mb-2">
              <input
                type="number"
                min={MIN_FOCUS_MINUTES}
                max={MAX_FOCUS_MINUTES}
                value={customMinutesInput}
                onChange={(e) => setCustomMinutesInput(e.target.value)}
                autoFocus
                aria-label="Số phút tập trung"
                className="w-14 min-w-0 px-2 py-1 rounded-lg text-[11px] font-mono font-semibold bg-[var(--card-2)] text-[var(--ink)] border border-[var(--line)] focus:outline-none focus:border-[var(--ink)]"
              />
              <span className="text-[10.5px] font-medium text-[var(--muted)] shrink-0">
                phút
              </span>
              <button
                type="submit"
                className="ml-auto px-2 py-1 rounded-lg text-[10.5px] font-bold bg-[#F29B23] text-[#161718] hover:brightness-105 transition cursor-pointer shrink-0"
              >
                Đặt
              </button>
              <button
                type="button"
                onClick={() => setIsEditingCustom(false)}
                aria-label="Đóng tùy chỉnh"
                title="Hủy"
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] transition cursor-pointer shrink-0"
              >
                <X size={12} strokeWidth={2.2} />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-1 mb-2" role="group" aria-label="Chọn thời lượng tập trung">
              {FOCUS_PRESETS.map((mins) => {
                const active = sessionTargetMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleSelectDuration(mins)}
                    aria-pressed={active}
                    title={`Tập trung ${mins} phút`}
                    className={`flex-1 px-1.5 py-1 rounded-lg text-[10.5px] font-semibold font-mono transition cursor-pointer border leading-none ${
                      active
                        ? "bg-[var(--thumb)] text-[var(--on-thumb)] border-transparent shadow-xs"
                        : "bg-[var(--card-2)]/70 text-[var(--muted)] border-transparent hover:text-[var(--ink)] hover:border-[var(--line)]"
                    }`}
                  >
                    {mins}p
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setCustomMinutesInput(String(sessionTargetMinutes));
                  setIsEditingCustom(true);
                }}
                aria-label="Tùy chỉnh thời gian tập trung"
                aria-pressed={!isPresetActive}
                title="Tùy chỉnh số phút (1–180 phút)"
                className={`w-7 h-[22px] rounded-lg flex items-center justify-center transition cursor-pointer border shrink-0 ${
                  !isPresetActive
                    ? "bg-[var(--thumb)] text-[var(--on-thumb)] border-transparent shadow-xs"
                    : "bg-[var(--card-2)]/70 text-[var(--muted)] border-transparent hover:text-[var(--ink)] hover:border-[var(--line)]"
                }`}
              >
                <SlidersHorizontal size={11} strokeWidth={2.2} />
              </button>
            </div>
          )}
        </div>

        {/* Thanh Pill đếm ngược chính + Nút Play/Pause */}
        <div className="timer__pill !h-11">
          <i
            className={`timer__fill${isRunning ? " is-active-flowing" : ""}`}
            style={{
              transform: `scaleX(${progressRatio})`,
              opacity: progressRatio > 0 ? 1 : 0,
              transition: isRunning
                ? "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease"
                : "transform 0.2s ease, opacity 0.2s ease",
            }}
          />
          <b className="timer__clock !text-[15px]">{formatClock(remainingSeconds)}</b>
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
